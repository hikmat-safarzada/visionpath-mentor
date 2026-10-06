const mongoose = require("mongoose");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const User = require("../models/User");
const Preference = require("../models/MentorPreference");
const Progress = require("../models/MentorProgress");
const MentorMessage = require("../models/MentorMessage");
const Delivery = require("../models/MentorDelivery");
const { HttpError } = require("../utils/http-error");
const { TIME_PATTERN, assertValidTimezone, getLocalDate, getLocalTime } = require("../utils/time");

const requireObjectId = (value, fieldName) => {
    if (!mongoose.isValidObjectId(value)) {
        throw new HttpError(400, `${fieldName} is not valid`, "INVALID_ID");
    }
};

const toDeliveryResponse = (delivery) => ({
    deliveryId: delivery._id.toString(),
    messageId: delivery.message_id._id ? delivery.message_id._id.toString() : delivery.message_id.toString(),
    externalMessageId: delivery.message_id.message_id,
    text: delivery.message_id.text,
    cycleDate: delivery.cycle_date
});

const ensureUser = async ({ telegramId, chatId, firstName, timezone }) => {
    if (!telegramId) {
        throw new HttpError(400, "telegramId is required", "TELEGRAM_ID_REQUIRED");
    }

    const suppliedTimezone = timezone || "Asia/Baku";
    if (!assertValidTimezone(suppliedTimezone)) {
        throw new HttpError(400, "timezone is not valid", "INVALID_TIMEZONE");
    }

    return User.findOneAndUpdate(
        { telegramId: String(telegramId) },
        {
            $set: {
                chatId: String(chatId || telegramId),
                timezone: suppliedTimezone,
                ...(firstName ? { firstName: firstName.trim() } : {})
            }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
};

const getUserByTelegramId = async (telegramId) => {
    if (!telegramId) {
        throw new HttpError(400, "telegramId is required", "TELEGRAM_ID_REQUIRED");
    }

    const user = await User.findOne({ telegramId: String(telegramId) });
    if (!user) {
        throw new HttpError(404, "Telegram user was not found. Send /start to the bot first.", "USER_NOT_FOUND");
    }
    return user;
};

const getMentorMessages = async (subcategoryId) => {
    requireObjectId(subcategoryId, "subcategoryId");
    return MentorMessage.find({ subcategory_id: subcategoryId }).sort({ sequence: 1 }).lean();
};

const getOrCreateProgress = async (userId, preference) => Progress.findOneAndUpdate(
    { user_id: userId, preference_id: preference._id },
    {
        $setOnInsert: {
            subcategory_id: preference.subcategory_id,
            liked_count: 0,
            progress: 0
        }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
);

const configurePreference = async ({ telegramId, chatId, firstName, timezone, subcategoryId, pushTime }) => {
    requireObjectId(subcategoryId, "subcategoryId");
    if (!TIME_PATTERN.test(pushTime || "")) {
        throw new HttpError(400, "pushTime must use HH:mm format", "INVALID_PUSH_TIME");
    }

    const user = await ensureUser({ telegramId, chatId, firstName, timezone });
    const subcategory = await Subcategory.findById(subcategoryId);
    if (!subcategory) {
        throw new HttpError(404, "Subcategory was not found", "SUBCATEGORY_NOT_FOUND");
    }

    const preference = await Preference.findOneAndUpdate(
        { user_id: user._id, subcategory_id: subcategory._id },
        {
            $set: {
                category_id: subcategory.category_id,
                push_time: pushTime,
                active: true
            }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const progress = await getOrCreateProgress(user._id, preference);

    return { user, preference, progress };
};

// Save the user's subcategory note before the push time is selected. Keep a new
// preference inactive so it cannot receive scheduled messages until onboarding
// has finished.
const createPendingPreference = async ({ telegramId, chatId, firstName, timezone, subcategoryId, note }) => {
    requireObjectId(subcategoryId, "subcategoryId");
    const user = await ensureUser({ telegramId, chatId, firstName, timezone });
    const subcategory = await Subcategory.findById(subcategoryId);
    if (!subcategory) {
        throw new HttpError(404, "Subcategory was not found", "SUBCATEGORY_NOT_FOUND");
    }
    const preference = await Preference.findOneAndUpdate(
        { user_id: user._id, subcategory_id: subcategory._id },
        {
            $set: {
                category_id: subcategory.category_id,
                note: note?.trim() || null
            },
            $setOnInsert: {
                push_time: "09:00",
                active: false
            }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const progress = await getOrCreateProgress(user._id, preference);
    return { user, preference, progress };
};

const findNextMessage = async (progress, subcategoryId, afterMessageId) => {
    let sequence = 0;
    const referenceMessageId = afterMessageId || progress.current_message;
    if (referenceMessageId) {
        const currentMessage = await MentorMessage.findById(referenceMessageId).select("sequence");
        if (currentMessage) {
            sequence = currentMessage.sequence;
        }
    }

    const nextMessage = await MentorMessage.findOne({
        subcategory_id: subcategoryId,
        sequence: { $gt: sequence }
    }).sort({ sequence: 1 });

    if (!nextMessage) {
        throw new HttpError(409, "This subcategory has no unused messages left", "CONTENT_EXHAUSTED");
    }
    return nextMessage;
};

const createDelivery = async ({ user, preference, progress, isDailyPush, afterMessageId, cycleDate }) => {
    if (progress.liked_count >= 20) {
        throw new HttpError(409, "This subcategory is already complete", "PROGRESS_COMPLETE");
    }

    const message = await findNextMessage(progress, preference.subcategory_id, afterMessageId);
    const delivery = await Delivery.create({
        user_id: user._id,
        preference_id: preference._id,
        message_id: message._id,
        cycle_date: cycleDate,
        is_daily_push: isDailyPush
    });

    progress.current_message = message._id;
    await progress.save();
    return Delivery.findById(delivery._id).populate("message_id");
};

const createDailyDelivery = async (preference, user, date = new Date()) => {
    const cycleDate = getLocalDate(user.timezone, date);
    const existing = await Delivery.findOne({
        user_id: user._id,
        preference_id: preference._id,
        cycle_date: cycleDate,
        is_daily_push: true
    }).populate("message_id");

    if (existing) {
        return { alreadySent: true, delivery: existing };
    }

    const progress = await getOrCreateProgress(user._id, preference);
    try {
        const delivery = await createDelivery({
            user,
            preference,
            progress,
            isDailyPush: true,
            cycleDate
        });
        return { alreadySent: false, delivery };
    } catch (error) {
        if (error && error.code === 11000) {
            const current = await Delivery.findOne({
                user_id: user._id,
                preference_id: preference._id,
                cycle_date: cycleDate,
                is_daily_push: true
            }).populate("message_id");
            return { alreadySent: true, delivery: current };
        }
        throw error;
    }
};

const createInitialDelivery = async (preference, user, date = new Date()) => {
    const progress = await getOrCreateProgress(user._id, preference);
    return createDelivery({
        user,
        preference,
        progress,
        isDailyPush: false,
        cycleDate: getLocalDate(user.timezone, date)
    });
};

const syncProgress = async (userId, preference) => {
    const likedCount = await Delivery.countDocuments({
        user_id: userId,
        preference_id: preference._id,
        action: "LIKE"
    });
    const cappedLikedCount = Math.min(likedCount, 20);
    return Progress.findOneAndUpdate(
        { user_id: userId, preference_id: preference._id },
        { $set: { liked_count: cappedLikedCount, progress: cappedLikedCount * 5 } },
        { new: true }
    );
};

const applyAction = async ({ telegramId, deliveryId, action }) => {
    requireObjectId(deliveryId, "deliveryId");
    if (!["LIKE", "OTHER"].includes(action)) {
        throw new HttpError(400, "action must be LIKE or OTHER", "INVALID_ACTION");
    }

    const user = await getUserByTelegramId(telegramId);
    const delivery = await Delivery.findOne({ _id: deliveryId, user_id: user._id })
        .populate("preference_id")
        .populate("message_id");
    if (!delivery) {
        throw new HttpError(404, "Mentor delivery was not found", "DELIVERY_NOT_FOUND");
    }
    if (delivery.action !== "NONE") {
        throw new HttpError(409, "This message has already been answered", "ACTION_ALREADY_RECORDED");
    }

    const preference = delivery.preference_id;
    const progress = await getOrCreateProgress(user._id, preference);
    if (action === "LIKE" && progress.liked_count >= 20) {
        throw new HttpError(409, "This subcategory is already complete", "PROGRESS_COMPLETE");
    }

    if (action === "OTHER") {
        const nextMessage = await findNextMessage(progress, preference.subcategory_id, delivery.message_id._id);
        const updated = await Delivery.findOneAndUpdate(
            { _id: delivery._id, action: "NONE" },
            { $set: { action: "OTHER", action_at: new Date() } },
            { new: true }
        );
        if (!updated) {
            throw new HttpError(409, "This message has already been answered", "ACTION_ALREADY_RECORDED");
        }

        const alternative = await Delivery.create({
            user_id: user._id,
            preference_id: preference._id,
            message_id: nextMessage._id,
            cycle_date: delivery.cycle_date,
            is_daily_push: false
        });
        progress.current_message = nextMessage._id;
        await progress.save();
        const populatedAlternative = await Delivery.findById(alternative._id).populate("message_id");
        return { action, progress, nextDelivery: toDeliveryResponse(populatedAlternative) };
    }

    try {
        const updated = await Delivery.findOneAndUpdate(
            { _id: delivery._id, action: "NONE" },
            { $set: { action: "LIKE", action_at: new Date() } },
            { new: true, runValidators: true }
        );
        if (!updated) {
            throw new HttpError(409, "This message has already been answered", "ACTION_ALREADY_RECORDED");
        }
    } catch (error) {
        if (error && error.code === 11000) {
            throw new HttpError(409, "Only one Like is counted per day", "DAILY_LIKE_EXISTS");
        }
        throw error;
    }

    const updatedProgress = await syncProgress(user._id, preference);
    return { action, progress: updatedProgress, completed: updatedProgress.liked_count === 20 };
};

const getProgress = async ({ telegramId, subcategoryId }) => {
    requireObjectId(subcategoryId, "subcategoryId");
    const user = await getUserByTelegramId(telegramId);
    const preference = await Preference.findOne({ user_id: user._id, subcategory_id: subcategoryId });
    if (!preference) {
        throw new HttpError(404, "A mentor preference for this subcategory was not found", "PREFERENCE_NOT_FOUND");
    }
    const progress = await getOrCreateProgress(user._id, preference);
    return { progress, preference };
};

const getDuePreferences = async (date = new Date()) => {
    const preferences = await Preference.find({ active: true }).populate("user_id");
    return preferences.filter(({ user_id: user, push_time: pushTime }) => user && getLocalTime(user.timezone, date) === pushTime);
};

module.exports = {
    ensureUser,
    getUserByTelegramId,
    getMentorMessages,
    configurePreference,
    createPendingPreference,
    createDailyDelivery,
    createInitialDelivery,
    applyAction,
    getProgress,
    getDuePreferences,
    toDeliveryResponse,
    getLocalDate
};
