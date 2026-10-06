const dns = require("node:dns");
const mongoose = require("mongoose");
const { config } = require("./config");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const connectDb = async () => {
    if (!config.mongoUrl) {
        throw new Error("MONGO_URL is not set. Add it to server/.env before starting the app or seeding data.");
    }

    const mongoUrl = config.mongoUrl.replace("<db_password>", config.mongoPass || "");
    await mongoose.connect(mongoUrl);
    console.log("Db connected successfully");
};

module.exports = { connectDb };
