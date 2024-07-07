const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    ideasCount: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Report', ReportSchema);
