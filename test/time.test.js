const test = require("node:test");
const assert = require("node:assert/strict");
const { TIME_PATTERN, assertValidTimezone, getLocalDate, getLocalTime } = require("../src/utils/time");

test("accepts valid daily push times", () => {
    assert.equal(TIME_PATTERN.test("08:00"), true);
    assert.equal(TIME_PATTERN.test("23:59"), true);
    assert.equal(TIME_PATTERN.test("24:00"), false);
    assert.equal(TIME_PATTERN.test("8:00"), false);
});

test("uses the user's timezone for daily delivery keys", () => {
    const date = new Date("2026-09-20T20:05:00.000Z");
    assert.equal(getLocalDate("Asia/Baku", date), "2026-09-21");
    assert.equal(getLocalTime("Asia/Baku", date), "00:05");
});

test("rejects an unknown IANA timezone", () => {
    assert.equal(assertValidTimezone("Asia/Baku"), "Asia/Baku");
    assert.equal(assertValidTimezone("Baku/Nowhere"), null);
});
