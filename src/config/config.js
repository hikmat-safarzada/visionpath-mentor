const path = require("node:path");
const dotenv = require("dotenv");

// Resolve this from the source directory so `node src/seed.js` also works
// when it is started from the repository root.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const config = {
    port: Number(process.env.PORT) || 8080,
    mongoUrl: process.env.MONGO_URL,
    mongoPass: process.env.MONGO_PASS,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN
};

module.exports = { config };
