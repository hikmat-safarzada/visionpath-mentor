const mongoose = require("mongoose");

const mentorPreferenceSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    subcategory_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subcategory",
        required: true
    },
    push_time: {
        type: String,
        required: true,
        match: /^([01]\d|2[0-3]):[0-5]\d$/
    },
    note: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null
    },
    active: {
        type: Boolean,
        default: true
    }
}, 
{
    timestamps: true
});

mentorPreferenceSchema.index({ user_id: 1, active: 1 });
mentorPreferenceSchema.index({ user_id: 1, subcategory_id: 1 }, { unique: true });

module.exports = mongoose.model("Preference", mentorPreferenceSchema);
