const mongoose = require("mongoose");

const mentorMessageSchema = new mongoose.Schema({
    message_id: {
        type: String,
        required: true,
        unique: true
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
    sequence: {
        type: Number,
        required: true,
        min: 1
    },
    text: {
        type: String,
        required: true
    }
}, 
{
    timestamps: true
});

mentorMessageSchema.index({ subcategory_id: 1, sequence: 1 }, { unique: true });

module.exports = mongoose.model("Message", mentorMessageSchema);
