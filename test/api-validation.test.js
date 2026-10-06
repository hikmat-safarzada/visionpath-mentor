const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/routes/app");

const withServer = async (run) => new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
        try {
            await run(server.address().port);
            server.close(resolve);
        } catch (error) {
            server.close(() => reject(error));
        }
    });
});

test("health endpoint responds without a database query", async () => {
    await withServer(async (port) => {
        const response = await fetch(`http://127.0.0.1:${port}/health`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { status: "ok" });
    });
});

test("selection endpoints reject requests without required identifiers", async () => {
    await withServer(async (port) => {
        const subcategories = await fetch(`http://127.0.0.1:${port}/api/subcategories`);
        const messages = await fetch(`http://127.0.0.1:${port}/api/mentor-messages`);
        const progress = await fetch(`http://127.0.0.1:${port}/api/mentor-progress`);

        assert.equal(subcategories.status, 400);
        assert.equal(messages.status, 400);
        assert.equal(progress.status, 400);
    });
});
