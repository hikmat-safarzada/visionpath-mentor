const { getSubcategoriesByCategory } = require("../services/subcategory.service");

const getSubcategory = async (req, res) => {
    try {
        const { categoryId } = req.query;
        if (!categoryId) {
            return res.status(400).json({ message: "categoryId is required" });
        }
        const subcategories = await getSubcategoriesByCategory(categoryId);
        return res.status(200).json({ subcategories });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "Subcategories could not be loaded"
        });
    }
};

module.exports = getSubcategory;
