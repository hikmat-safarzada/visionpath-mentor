const mentorService = require("../services/mentor.service");

const getMessages = async (req, res) => {
    try {
        if (!req.query.subcategoryId) {
            return res.status(400).json({ message: "subcategoryId is required" });
        }
        const messages = await mentorService.getMentorMessages(req.query.subcategoryId);
        return res.status(200).json({ messages });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Messages could not be loaded" });
    }
};

const savePreference = async (req, res) => {
    try {
        const result = await mentorService.configurePreference(req.body);
        return res.status(201).json({
            preference: result.preference,
            progress: result.progress
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Preference could not be saved" });
    }
};

const recordAction = async (req, res) => {
    try {
        const result = await mentorService.applyAction(req.body);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Action could not be recorded" });
    }
};

const getCurrentProgress = async (req, res) => {
    try {
        const result = await mentorService.getProgress(req.query);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Progress could not be loaded" });
    }
};

const acknowledgeReminder = (req, res) => res.status(204).end();

module.exports = { getMessages, savePreference, recordAction, getCurrentProgress, acknowledgeReminder };
