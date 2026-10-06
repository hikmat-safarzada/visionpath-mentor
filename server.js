require("dotenv").config();
const { connectDb } = require("./src/config/database");
const { config } = require("./src/config/config");
const app = require("./src/routes/app");
const { createTelegramBot } = require("./src/services/telegram.service");
const { startScheduler } = require("./src/services/scheduler.service");

const start = async () => {
    await connectDb();
    const bot = createTelegramBot(config.telegramBotToken);
    if (bot) {
        startScheduler(bot);
    }

    app.listen(config.port, () => {
        console.log(`Server is running on port ${config.port}`);
    });
};

start().catch((error) => {
    console.error("Server could not start:", error.message);
    process.exit(1);
});
