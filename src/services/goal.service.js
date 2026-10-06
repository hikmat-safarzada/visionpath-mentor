const Goal = require("../models/Goal");
const User = require("../models/User");
const { GOAL_CATALOG, getPlan } = require("../data/goal-catalog");

const CATEGORIES = Object.keys(GOAL_CATALOG);
const PROGRESS_VALUES = [0,25,50,75,100];

const getUser = (telegramId) => User.findOne({ telegramId: String(telegramId) });
const weekKey = (date = new Date()) => {
  const d = new Date(date); d.setHours(0,0,0,0);
  const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0,10);
};

const createGoal = async ({ userId, category, title, periodMonths }) => {
  if (!CATEGORIES.includes(category) || !GOAL_CATALOG[category].includes(title)) throw new Error("Hazır hədəf seçilməlidir.");
  const count = await Goal.countDocuments({ user_id: userId, active: true });
  if (count >= 5) throw new Error("Maksimum 5 aktiv hədəf seçə bilərsən.");
  const plan = getPlan(title);
  return Goal.create({
    user_id: userId, category, title, periodMonths,
    monthlySteps: plan.monthly.map(label => ({ label })),
    weeklySteps: plan.weekly.map(label => ({ label })),
    dailySteps: plan.daily.map(label => ({ label }))
  });
};

const activeGoals = (userId) => Goal.find({ user_id: userId, active: true }).sort({ createdAt: 1 });

const setPlan = async (goalId, kind, ids) => {
  const field = { monthly: "monthlySteps", weekly: "weeklySteps", daily: "dailySteps" }[kind];
  if (!field) throw new Error("Plan növü yanlışdır.");
  return Goal.findByIdAndUpdate(goalId, { $set: { [`${field}.$[].selected`]: false } }, { new: true }).then(async () => {
    return Goal.findByIdAndUpdate(goalId, { $set: Object.fromEntries(ids.map(id => [`${field}.$[step].selected`, true])) }, { arrayFilters: [{ "step._id": { $in: ids } }], new: true });
  });
};

const updateProgress = async (goalId, progress) => {
  progress = Number(progress);
  if (!PROGRESS_VALUES.includes(progress)) throw new Error("Progress 0, 25, 50, 75 və ya 100 olmalıdır.");
  const goal = await Goal.findById(goalId);
  if (!goal) throw new Error("Hədəf tapılmadı.");
  const currentKey = weekKey();
  const previousEntry = [...goal.history].filter(h => h.weekKey !== currentKey).sort((a,b) => b.weekKey.localeCompare(a.weekKey))[0];
  const previous = previousEntry ? previousEntry.progress : goal.progress;
  const existing = goal.history.find(h => h.weekKey === currentKey);
  if (existing) existing.progress = progress;
  else goal.history.push({ weekKey: currentKey, progress, completedSteps: goal.weeklySteps.filter(s => s.selected && s.completed).length });
  goal.progress = progress;
  goal.completed = progress === 100;
  await goal.save();
  return { goal, previous, delta: progress - previous, previousEntry };
};

const markStep = async (goalId, kind, stepId) => {
  const field = { monthly: "monthlySteps", weekly: "weeklySteps", daily: "dailySteps" }[kind];
  if (!field) throw new Error("Plan növü yanlışdır.");
  return Goal.findOneAndUpdate({ _id: goalId, [`${field}._id`]: stepId }, { $set: { [`${field}.$.completed`]: true } }, { new: true });
};

const feedback = (delta, goal) => {
  const sign = delta > 0 ? `+${delta}%` : `${delta}%`;
  const focus = goal.weeklySteps.find(s => s.selected && !s.completed)?.label || goal.weeklySteps[0]?.label || "planını davam etdir";
  return `Keçən həftə ${Math.max(0, goal.progress - delta)}%, bu həftə ${goal.progress}%. ${sign} irəliləyiş var.\n\nNövbəti həftə əsas fokusun: “${focus}”.`;
};

module.exports = { CATEGORIES, GOAL_CATALOG, PROGRESS_VALUES, getUser, createGoal, activeGoals, setPlan, updateProgress, markStep, weekKey, feedback };
