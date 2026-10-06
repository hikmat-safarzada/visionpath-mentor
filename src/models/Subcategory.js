const mongoose = require("mongoose");

const subcategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    }
}, {
    timestamps: true
});

subcategorySchema.index({ category_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Subcategory", subcategorySchema);
