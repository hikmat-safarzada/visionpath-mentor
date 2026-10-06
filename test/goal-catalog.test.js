const test = require("node:test");
const assert = require("node:assert/strict");
const { GOAL_CATALOG, getPlan } = require("../src/data/goal-catalog");

test("MVP has exactly five standard categories with five preset goals each", () => {
  assert.equal(Object.keys(GOAL_CATALOG).length, 5);
  for (const goals of Object.values(GOAL_CATALOG)) assert.equal(goals.length, 5);
});

test("English goal has monthly, weekly and daily preset plans", () => {
  const plan = getPlan("İngilis dilimi inkişaf etdirmək");
  assert.equal(plan.monthly.length, 3);
  assert.equal(plan.weekly.length, 3);
  assert.equal(plan.daily.length, 3);
});
