const express = require('express');
const router = express.Router();
const Report = require('../models/model.Report');

// Get the report
router.get('/', async (req, res) => {
    try {
        const report = await Report.findOne();
        res.json(report || { totalStudentIdeas: 0, totalTeacherIdeas: 0 });
    } catch (err) {
        console.error('Error fetching report:', err.message);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
