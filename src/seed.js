const path = require("path");
const { readSheet } = require("read-excel-file/node");
const { connectDb } = require("./config/database");
const Category = require("./models/Category");
const Subcategory = require("./models/Subcategory");
const MentorMessage = require("./models/MentorMessage");

const sourceFile = path.join(__dirname, "data", "data.xlsx");

const readRows = async () => {
    const rows = await readSheet(sourceFile, "Message Library");
    const [headers, ...dataRows] = rows;
    if (!headers || headers.join("|") !== "Category|Subcategory|Message_ID|Message") {
        throw new Error("Message Library sheet was not found");
    }

    const messageRows = dataRows.map((row) => Object.fromEntries(
        headers.map((header, index) => [header, row[index] || ""])
    ));
    if (messageRows.length !== 1250) {
        throw new Error(`Expected 1250 messages, found ${messageRows.length}`);
    }
    return messageRows;
};

const validateRows = (rows) => {
    const pairs = new Map();
    const messageIds = new Set();

    for (const row of rows) {
        const category = row.Category?.trim();
        const subcategory = row.Subcategory?.trim();
        const messageId = String(row.Message_ID || "").trim();
        const text = row.Message?.trim();
        if (!category || !subcategory || !messageId || !text) {
            throw new Error("Every message row must include Category, Subcategory, Message_ID and Message");
        }
        if (messageIds.has(messageId)) {
            throw new Error(`Duplicate Message_ID: ${messageId}`);
        }
        messageIds.add(messageId);
        const pair = `${category}\u0000${subcategory}`;
        pairs.set(pair, (pairs.get(pair) || 0) + 1);
    }

    if (pairs.size !== 25 || [...pairs.values()].some((count) => count !== 50)) {
        throw new Error("The library must contain 25 subcategories with 50 messages each");
    }
};

const getSequence = (messageId) => {
    const sequence = Number(messageId.split("-").at(-1));
    if (!Number.isInteger(sequence) || sequence < 1) {
        throw new Error(`Message_ID has an invalid sequence: ${messageId}`);
    }
    return sequence;
};

const seed = async () => {
    const rows = await readRows();
    validateRows(rows);

    const categories = new Map();
    const subcategories = new Map();

    for (const row of rows) {
        const categoryName = row.Category.trim();
        const subcategoryName = row.Subcategory.trim();
        let category = categories.get(categoryName);
        if (!category) {
            category = await Category.findOneAndUpdate(
                { name: categoryName },
                { $setOnInsert: { name: categoryName } },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
            categories.set(categoryName, category);
        }

        const subcategoryKey = `${categoryName}\u0000${subcategoryName}`;
        let subcategory = subcategories.get(subcategoryKey);
        if (!subcategory) {
            subcategory = await Subcategory.findOneAndUpdate(
                { category_id: category._id, name: subcategoryName },
                { $setOnInsert: { category_id: category._id, name: subcategoryName } },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
            subcategories.set(subcategoryKey, subcategory);
        }

        await MentorMessage.updateOne(
            { message_id: String(row.Message_ID).trim() },
            {
                $set: {
                    category_id: category._id,
                    subcategory_id: subcategory._id,
                    sequence: getSequence(String(row.Message_ID).trim()),
                    text: row.Message.trim()
                }
            },
            { upsert: true, setDefaultsOnInsert: true }
        );
    }

    console.log(`Seed complete: ${categories.size} categories, ${subcategories.size} subcategories, ${rows.length} messages`);
};

connectDb()
    .then(seed)
    .catch((error) => {
        console.error("Seed failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        const mongoose = require("mongoose");
        await mongoose.disconnect();
    });
