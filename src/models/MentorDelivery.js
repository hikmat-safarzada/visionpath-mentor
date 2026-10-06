const mongoose = require("mongoose");

const mentorDeliverySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    preference_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Preference",
        required: true
    },
    message_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        required: true
    },
    cycle_date: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/
    },
    is_daily_push: {
        type: Boolean,
        default: false
    },
    sent_at: {
        type: Date,
        default: Date.now
    },
    action: {
        type: String,
        enum: ["LIKE", "OTHER", "NONE"],
        default: "NONE"
    },
    action_at: {
        type: Date,
        default: null
    },
    telegram_message_id: {
        type: String,
        default: null
    }
}, 
{
    timestamps: true
});

mentorDeliverySchema.index(
    { user_id: 1, preference_id: 1, cycle_date: 1, is_daily_push: 1 },
    { unique: true, partialFilterExpression: { is_daily_push: true } }
);
mentorDeliverySchema.index(
    { user_id: 1, preference_id: 1, cycle_date: 1, action: 1 },
    { unique: true, partialFilterExpression: { action: "LIKE" } }
);

module.exports = mongoose.model("Delivery", mentorDeliverySchema);
