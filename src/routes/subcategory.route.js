const getSubcategory = require("../controllers/subcategory.controller")
const express = require("express");
const router = express.Router();

router.get("/", getSubcategory);
module.exports = router