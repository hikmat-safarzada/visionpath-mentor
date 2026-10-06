const mongoose = require("mongoose");

const mentorProgressSchema = new mongoose.Schema({
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
    subcategory_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subcategory",
        required: true
    },
    liked_count: {
        type: Number,
        default: 0,
        min: 0,
        max: 20
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    current_message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    }
}, {
    timestamps: true
});

mentorProgressSchema.index({ user_id: 1, preference_id: 1 }, { unique: true });

module.exports = mongoose.model("Progress", mentorProgressSchema);
