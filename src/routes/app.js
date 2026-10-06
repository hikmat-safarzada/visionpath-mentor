const express = require("express");
const app = express();
const categoryRouter = require("./category.routes");
const subcategoryRouter = require("./subcategory.route");
const mentorRouter = require("./mentor.route");
const mentorController = require("../controllers/mentor.controller");
const goalController = require("../controllers/goal.controller");

app.use(express.json());
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.use("/api/categories", categoryRouter);
app.use("/api/subcategories", subcategoryRouter);
app.use("/subcategories", subcategoryRouter);
app.use("/api/mentor", mentorRouter);
app.get("/api/mentor-messages", mentorController.getMessages);
app.post("/api/mentor-preference", mentorController.savePreference);
app.post("/api/mentor-action", mentorController.recordAction);
app.get("/api/mentor-progress", mentorController.getCurrentProgress);
app.get("/api/goals", goalController.getGoals);
app.post("/api/mentor-reminder/ack", mentorController.acknowledgeReminder);

module.exports = app;
