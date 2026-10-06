const mongoose = require("mongoose");
const Subcategory = require("../models/Subcategory");

const getSubcategoriesByCategory = async (categoryId) => {
    if (!mongoose.isValidObjectId(categoryId)) {
        const error = new Error("categoryId is not valid");
        error.statusCode = 400;
        throw error;
    }

    return Subcategory.find({ category_id: categoryId }).sort({ name: 1 }).lean();
};

module.exports = { getSubcategoriesByCategory };
