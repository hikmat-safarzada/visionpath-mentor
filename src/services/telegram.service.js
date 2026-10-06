const { randomBytes } = require("crypto");
const { Bot } = require("node-telegram-bot-api");
const User = require("../models/User");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const Preference = require("../models/MentorPreference");
const Progress = require("../models/MentorProgress");
const mentorService = require("./mentor.service");
const { TIME_PATTERN } = require("../utils/time");

const START_TEXT = "Salam! Mən VisionPath mentoram. Sənin hədəflərini seçib onları plan və həftəlik progress sisteminə çevirəcəyik. Sənə necə müraciət edək?";
const MAIN_KEYBOARD = {
  // Keep the persistent navigation intentionally small. Adding a direction is
  // available from the Vision Board itself, so it does not need a third nav item.
  keyboard: [[{ text: "🚀 Başla" }, { text: "📊 Vision Board" }]],
  resize_keyboard: true
};
const shortToken = () => randomBytes(4).toString("hex");
const inline = (rows) => ({ inline_keyboard: rows });
const categoryLabel = (rawName = "") => {
  // The source workbook contains a few private-use characters in place of
  // emoji. Telegram renders those characters as empty squares.
  const name = rawName.replace(/[\uE000-\uF8FF]/gu, "").trim();
  if (/\p{Extended_Pictographic}/u.test(name)) return name;
  if (/karyera|inkişaf/i.test(name)) return `💼 ${name}`;
  if (/maliyyə|pul|gəlir/i.test(name)) return `💰 ${name}`;
  if (/sağlam|aktiv/i.test(name)) return `💪 ${name}`;
  if (/səyahət|təcrüb/i.test(name)) return `✈️ ${name}`;
  if (/şəxsi|balans/i.test(name)) return `❤️ ${name}`;
  return `🎯 ${name}`;
};

const callback = (user, action, value = "") =>
  ["VP", user.activeSessionId, user.activeCallbackNonce, action, value].filter(Boolean).join(":");

const buttonRows = (user, action, items) => items.map((item) => ([{
  text: item.text,
  callback_data: callback(user, action, String(item.value))
}]));

const ensureUser = (ctx) => User.findOneAndUpdate(
  { telegramId: String(ctx.from.id) },
  {
    $set: {
      chatId: String(ctx.chat?.id || ctx.from.id),
      firstName: ctx.from.first_name || undefined,
      timezone: "Asia/Baku"
    },
    $setOnInsert: { onboardingState: "welcome" }
  },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);

// Every rendered inline prompt has a one-use nonce. The atomic consume below
// rejects double taps and buttons left over from an earlier message or session.
const beginSession = (user, state) => User.findByIdAndUpdate(user._id, {
  $set: { onboardingState: state, activeSessionId: shortToken(), activeCallbackNonce: shortToken() }
}, { new: true });

const nextPrompt = (user, state) => User.findByIdAndUpdate(user._id, {
  $set: { onboardingState: state, activeCallbackNonce: shortToken() }
}, { new: true });

const consumeCallback = async (ctx, { session, nonce, states }) => {
  const user = await User.findOneAndUpdate({
    telegramId: String(ctx.from.id),
    activeSessionId: session,
    activeCallbackNonce: nonce,
    onboardingState: { $in: states }
  }, { $set: { activeCallbackNonce: null } }, { new: true });
  if (user) return user;
  await ctx.answerCallbackQuery({
    text: "Bu düymə artıq aktiv deyil. Yeni seçim üçün cari mesajdan davam et.",
    show_alert: true
  }).catch(() => {});
  return null;
};

const askForName = async (ctx, user) => {
  await beginSession(user, "name");
  return ctx.reply(START_TEXT, { reply_markup: MAIN_KEYBOARD });
};

const showCategories = async (ctx, user) => {
  const categories = await Category.find().sort({ name: 1 }).lean();
  if (!categories.length) {
    await ctx.reply("Kateqoriyalar hələ hazırlanmayıb. Administrator əvvəlcə `npm run seed` işlətməlidir.");
    return null;
  }
  const fresh = await nextPrompt(user, "category");
  await ctx.reply("🎯 Hədəfin üçün kateqoriya seç:", {
    reply_markup: inline(buttonRows(fresh, "C", categories.map((category) => ({ text: categoryLabel(category.name), value: category._id }))))
  });
  return fresh;
};

const showSubcategories = async (ctx, user, categoryId) => {
  const category = await Category.findById(categoryId).lean();
  const subcategories = await Subcategory.find({ category_id: categoryId }).sort({ name: 1 }).lean();
  if (!category || !subcategories.length) throw new Error("Bu kateqoriyada hələ subkateqoriya yoxdur.");
  const fresh = await nextPrompt(user, "subcategory");
  await ctx.reply(`${categoryLabel(category.name)} üçün subkateqoriya seç:`, {
    reply_markup: inline(buttonRows(fresh, "S", subcategories.map((subcategory) => ({ text: subcategory.name, value: subcategory._id }))))
  });
  return fresh;
};

const PUSH_TIMES = ["08:00", "09:00", "10:00", "18:00", "20:00", "21:00"];
const DEFAULT_NOTE = "Bu istiqamətdə davamlı irəliləyiş etmək istəyirəm.";
const showPushTimes = async (ctx, user) => {
  const fresh = await nextPrompt(user, "push_time");
  await ctx.reply("🕒 Seçilmiş subkateqoriya üçün mentor qeydini hər gün hansı saatda göndərək?", {
    reply_markup: inline(buttonRows(fresh, "T", PUSH_TIMES.map((time) => ({ text: time, value: time.replace(":", "") }))))
  });
  return fresh;
};

const showNoteChoice = async (ctx, user) => {
  const fresh = await nextPrompt(user, "note_choice");
  return ctx.reply(`📝 Vision Board üçün standart qeyd:\n\n“${DEFAULT_NOTE}”\n\nİstəsən dəyişə bilərsən, yoxsa bu qeyd ilə davam et.`, {
    reply_markup: inline([[
      { text: "➡️ Bu qeyd ilə davam et", callback_data: callback(fresh, "N", "DEFAULT") },
      { text: "✏️ Qeydi dəyiş", callback_data: callback(fresh, "N", "EDIT") }
    ]])
  });
};

const saveNoteAndShowPushTimes = async (ctx, user, note) => {
  if (!user.pendingSubcategoryId) {
    return ctx.reply("Subkateqoriya seçimi tapılmadı. Yenidən 🚀 Başla düyməsinə toxun.");
  }
  await mentorService.createPendingPreference({
    telegramId: ctx.from.id,
    chatId: ctx.chat?.id || ctx.from.id,
    firstName: ctx.from.first_name,
    timezone: "Asia/Baku",
    subcategoryId: user.pendingSubcategoryId,
    note
  });
  return showPushTimes(ctx, await User.findById(user._id));
};

const progressText = (progress) => progress >= 100 ? "🟢 Completed" : `Progress ${progress}% oldu`;

const showVision = async (ctx, user) => {
  const fresh = await beginSession(user, "done");
  const preferences = await Preference.find({ user_id: fresh._id, active: true })
    .populate("category_id", "name")
    .populate("subcategory_id", "name")
    .lean();
  const progressRows = await Progress.find({ user_id: fresh._id }).lean();
  const progressByPreference = new Map(progressRows.map((entry) => [String(entry.preference_id), entry.progress]));
  if (!preferences.length) {
    return ctx.reply("📊 VISION DASHBOARD\n\nHələ istiqamət seçilməyib.", {
      reply_markup: inline([[{ text: "➕ İlk istiqaməti seç", callback_data: callback(fresh, "A") }]])
    });
  }

  const groups = new Map();
  for (const preference of preferences) {
    const categoryName = categoryLabel(preference.category_id?.name || "Kateqoriya");
    if (!groups.has(categoryName)) groups.set(categoryName, []);
    const progress = progressByPreference.get(String(preference._id)) || 0;
    const note = preference.note ? `\n  📝 ${preference.note}` : "";
    groups.get(categoryName).push(`• ${preference.subcategory_id?.name || "Subkateqoriya"} — ${progressText(progress)}${note}`);
  }
  const text = ["📊 VISION DASHBOARD", ...[...groups.entries()].map(([category, rows]) => `\n${category}\n${rows.join("\n")}`)].join("\n");
  return ctx.reply(text, {
    reply_markup: inline([[{ text: "➕ Yeni istiqamət", callback_data: callback(fresh, "A") }]])
  });
};

const sendMentorDelivery = async (ctx, delivery) => ctx.reply(`📝 Seçdiyin subkateqoriyaya uyğun mentor qeydi:\n\n${delivery.message_id.text}\n\n❤️ Bəyəndikdə yalnız bu subkateqoriyanın progressi 5% artır.`, {
  reply_markup: inline([[
    { text: "❤️ Bəyəndim", callback_data: `MA:${delivery._id}:LIKE` },
    { text: "🔄 Digər qeyd", callback_data: `MA:${delivery._id}:OTHER` }
  ]])
});

const startNewDirection = async (ctx, user) => {
  const fresh = await beginSession(user, "category");
  return showCategories(ctx, fresh);
};

const createTelegramBot = (token) => {
  if (!token) {
    console.warn("Telegram bot is disabled. Set TELEGRAM_BOT_TOKEN to enable it.");
    return null;
  }
  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    const user = await ensureUser(ctx);
    if (user.preferredName) {
      return ctx.reply(`Salam, ${user.preferredName}! 🚀 Başla ilə yeni istiqamət seçə və ya 📊 Vision Board düyməsi ilə dashboard-a baxa bilərsən.`, {
        reply_markup: MAIN_KEYBOARD
      });
    }
    return askForName(ctx, user);
  });

  bot.command("vision", async (ctx) => {
    const user = await ensureUser(ctx);
    if (!user.preferredName) return ctx.reply("Salam! Əvvəlcə 🚀 Başla düyməsi ilə başlayaq.", { reply_markup: MAIN_KEYBOARD });
    return showVision(ctx, user);
  });

  bot.on("message", async (ctx) => {
    const text = ctx.message?.text?.trim();
    if (!text || text.startsWith("/")) {
      // Stickers, media and whitespace-only messages cannot be used as a name.
      // Give a useful response only while the bot is explicitly awaiting one.
      if ((ctx.message?.sticker || ctx.message?.animation || ctx.message?.photo) && !text) {
        const pendingUser = await ensureUser(ctx);
        if (pendingUser.onboardingState === "name") {
          await ctx.reply("Adını stiker yox, mətn kimi yaz.", { reply_markup: MAIN_KEYBOARD });
        }
      }
      return;
    }
    const user = await ensureUser(ctx);
    if (text === "📊 Vision Board") {
      if (!user.preferredName) return ctx.reply("Salam! Əvvəlcə 🚀 Başla düyməsi ilə başlayaq.", { reply_markup: MAIN_KEYBOARD });
      return showVision(ctx, user);
    }
    if (text === "🚀 Başla") {
      if (!user.preferredName) return askForName(ctx, user);
      return startNewDirection(ctx, user);
    }
    if (user.onboardingState === "name") {
      if (text.length < 2 || text.length > 50) return ctx.reply("Zəhmət olmasa 2–50 simvoldan ibarət ad yaz.");
      await User.updateOne({ _id: user._id }, { $set: { preferredName: text, onboardingState: "category" } });
      await ctx.reply(`Tanış olduğuma şadam, ${text}!`, { reply_markup: MAIN_KEYBOARD });
      return showCategories(ctx, await User.findById(user._id));
    }
    if (user.onboardingState !== "note") return;
    if (text.length > 1000) return ctx.reply("Qeyd maksimum 1000 simvol ola bilər. Zəhmət olmasa qısaldıb yenidən yaz.");
    if (!text.length) return ctx.reply("Zəhmət olmasa qeydi mətn kimi yaz.");
    return saveNoteAndShowPushTimes(ctx, user, text);
  });

  bot.on("callback_query", async (ctx) => {
    const data = ctx.callbackQuery?.data || "";
    try {
      // These buttons do not use the flow nonce: MentorDelivery.action provides
      // a database-level one-time guard for every daily message.
      if (data.startsWith("MA:")) {
        const [, deliveryId, action] = data.split(":");
        const result = await mentorService.applyAction({ telegramId: ctx.from.id, deliveryId, action });
        await ctx.answerCallbackQuery({ text: progressText(result.progress.progress) });
        if (result.nextDelivery) return sendMentorDelivery(ctx, { _id: result.nextDelivery.deliveryId, message_id: { text: result.nextDelivery.text } });
        return ctx.reply(progressText(result.progress.progress));
      }

      const [prefix, session, nonce, action, value] = data.split(":");
      if (prefix !== "VP" || !session || !nonce || !action) {
        return ctx.answerCallbackQuery({ text: "Bu seçim artıq aktiv deyil.", show_alert: true });
      }
      const expectedStates = { C: ["category"], S: ["subcategory"], N: ["note_choice"], T: ["push_time"], A: ["done"] }[action];
      if (!expectedStates) return ctx.answerCallbackQuery({ text: "Bu seçim artıq aktiv deyil.", show_alert: true });
      const user = await consumeCallback(ctx, { session, nonce, states: expectedStates });
      if (!user) return;
      await ctx.answerCallbackQuery();
      if (action === "A") return showCategories(ctx, user);
      if (action === "C") {
        const category = await Category.findById(value).lean();
        if (!category) throw new Error("Kateqoriya tapılmadı.");
        await User.updateOne({ _id: user._id }, { $set: { pendingCategoryId: category._id } });
        return showSubcategories(ctx, await User.findById(user._id), category._id);
      }
      if (action === "S") {
        const subcategory = await Subcategory.findOne({ _id: value, category_id: user.pendingCategoryId }).lean();
        if (!subcategory) throw new Error("Subkateqoriya seçimi etibarsızdır.");
        await User.updateOne({ _id: user._id }, { $set: { pendingSubcategoryId: subcategory._id } });
        return showNoteChoice(ctx, await User.findById(user._id));
      }
      if (action === "N") {
        if (value === "DEFAULT") return saveNoteAndShowPushTimes(ctx, user, DEFAULT_NOTE);
        if (value === "EDIT") {
          await User.updateOne({ _id: user._id }, { $set: { onboardingState: "note" } });
          return ctx.reply("📝 Dəyişmək istədiyin qeydi mətn kimi yaz:", {
            reply_markup: { force_reply: true, input_field_placeholder: DEFAULT_NOTE }
          });
        }
        throw new Error("Qeyd seçimi etibarsızdır.");
      }
      if (action === "T") {
        const time = `${value?.slice(0, 2)}:${value?.slice(2)}`;
        if (!TIME_PATTERN.test(time) || !user.pendingCategoryId || !user.pendingSubcategoryId) throw new Error("Vaxt və ya seçim etibarsızdır.");
        const { preference } = await mentorService.configurePreference({
          telegramId: ctx.from.id,
          chatId: ctx.chat?.id || ctx.from.id,
          firstName: ctx.from.first_name,
          timezone: "Asia/Baku",
          subcategoryId: user.pendingSubcategoryId,
          pushTime: time
        });
        await User.updateOne({ _id: user._id }, { $set: { onboardingState: "done", pendingCategoryId: null, pendingSubcategoryId: null, activeCallbackNonce: null } });
        await ctx.reply(`⏰ Gündəlik push vaxtın ${time} olaraq quruldu.`, { reply_markup: MAIN_KEYBOARD });
        const initialDelivery = await mentorService.createInitialDelivery(preference, user);
        await sendMentorDelivery(ctx, initialDelivery);
        return;
      }
    } catch (error) {
      console.error("Telegram callback failed:", error);
      await ctx.answerCallbackQuery({ text: error.message || "Xəta baş verdi", show_alert: true }).catch(() => {});
      // A validation/database error must not strand the user behind a consumed
      // callback. Render a fresh session whose buttons are safe to use.
      const recoveryUser = await ensureUser(ctx).catch(() => null);
      if (!recoveryUser) return;
      if (recoveryUser.preferredName) {
        return ctx.reply("Əməliyyat tamamlanmadı. Davam etmək üçün 🚀 Başla və ya 📊 Vision Board seç.", {
          reply_markup: MAIN_KEYBOARD
        }).catch(() => {});
      }
      await ctx.reply("Əməliyyat tamamlanmadı. Yenidən başlamaq üçün 🚀 Başla düyməsinə toxun.", {
        reply_markup: MAIN_KEYBOARD
      }).catch(() => {});
    }
  });

  bot.catch((error) => console.error("Telegram update failed:", error.message));
  bot.startPolling().catch((error) => console.error("Telegram polling error:", error.message));
  return bot;
};

module.exports = { createTelegramBot, sendDelivery: sendMentorDelivery };
