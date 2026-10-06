const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    telegramId: {
        type: String,
        required: true,
        unique: true
    },
    chatId: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        trim: true
    },
    preferredName: { type: String, trim: true },
    birthDate: { type: Date, default: null },
    // The legacy goal-planner states are retained so existing users can still be read.
    // New Telegram onboarding uses welcome -> name -> category -> subcategory -> note_choice -> note -> push_time -> done.
    onboardingState: { type: String, enum: ["welcome", "name", "category", "subcategory", "note_choice", "note", "push_time", "done", "birth", "period", "goal", "plan"], default: "welcome" },
    planningPeriodMonths: { type: Number, enum: [6, 12], default: null },
    pendingCategory: { type: String, default: null },
    pendingCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    pendingSubcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Subcategory", default: null },
    // Inline buttons carry these short-lived values.  A new prompt rotates the nonce,
    // therefore a click in an older bot message cannot advance the flow.
    activeSessionId: { type: String, default: null },
    activeCallbackNonce: { type: String, default: null },
    timezone: {
        type: String,
        default: "Asia/Baku"
    }
}, 
{
    timestamps : true
})
module.exports = mongoose.model("User", userSchema);
