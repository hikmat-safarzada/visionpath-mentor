const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const assertValidTimezone = (timezone) => {
    try {
        Intl.DateTimeFormat("en-US", { timeZone: timezone });
        return timezone;
    } catch {
        return null;
    }
};

const localDateParts = (timezone, date = new Date()) => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    });

    return Object.fromEntries(
        formatter.formatToParts(date)
            .filter(({ type }) => type !== "literal")
            .map(({ type, value }) => [type, value])
    );
};

const getLocalDate = (timezone, date) => {
    const parts = localDateParts(timezone, date);
    return `${parts.year}-${parts.month}-${parts.day}`;
};

const getLocalTime = (timezone, date) => {
    const parts = localDateParts(timezone, date);
    return `${parts.hour}:${parts.minute}`;
};

module.exports = { TIME_PATTERN, assertValidTimezone, getLocalDate, getLocalTime };
