const mongoose = require("mongoose");

const stepSchema = new mongoose.Schema({
  label: { type: String, required: true },
  selected: { type: Boolean, default: true },
  completed: { type: Boolean, default: false }
}, { _id: true });

const historySchema = new mongoose.Schema({
  weekKey: { type: String, required: true },
  progress: { type: Number, enum: [0,25,50,75,100], required: true },
  completedSteps: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const goalSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  periodMonths: { type: Number, enum: [6, 12], required: true },
  progress: { type: Number, enum: [0,25,50,75,100], default: 0 },
  monthlySteps: [stepSchema],
  weeklySteps: [stepSchema],
  dailySteps: [stepSchema],
  reminderTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: null },
  lastReminderDate: { type: String, default: null },
  history: [historySchema],
  active: { type: Boolean, default: true },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

goalSchema.index({ user_id: 1, active: 1 });
goalSchema.index({ user_id: 1, title: 1, periodMonths: 1 });
module.exports = mongoose.model("Goal", goalSchema);
