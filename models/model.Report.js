const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    totalStudentIdeas: {
        type: Number,
        default: 0,
    },
    totalTeacherIdeas: {
        type: Number,
        default: 0,
    },
    // Add other general fields as needed
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);

