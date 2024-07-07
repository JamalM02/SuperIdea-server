const express = require('express');
const router = express.Router();
const Report = require('../models/model.Report');
const Idea = require('../models/model.Idea');

// Get the report
router.get('/', async (req, res) => {
    try {
        const studentCount = await Idea.countDocuments({ 'user.type': 'Student' });
        const teacherCount = await Idea.countDocuments({ 'user.type': 'Teacher' });
        res.json({ studentIdeasCount: studentCount, teacherIdeasCount: teacherCount });
    } catch (err) {
        console.error('Error fetching report:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// Increment the ideas count (already handled in idea creation route)
router.post('/increment-ideas', async (req, res) => {
    try {
        const { type } = req.body; // Assuming req.body contains the user type
        const updateField = type === 'Student' ? { $inc: { studentIdeasCount: 1 } } : { $inc: { teacherIdeasCount: 1 } };
        const report = await Report.findOneAndUpdate({}, updateField, { new: true, upsert: true });
        res.status(200).json(report);
    } catch (err) {
        console.error('Error incrementing ideas count:', err.message);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
