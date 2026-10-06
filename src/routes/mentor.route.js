const express = require("express");
const controller = require("../controllers/mentor.controller");

const router = express.Router();

router.get("/messages", controller.getMessages);
router.post("/preferences", controller.savePreference);
router.post("/actions", controller.recordAction);
router.get("/progress", controller.getCurrentProgress);
router.post("/reminder/ack", controller.acknowledgeReminder);

module.exports = router;
