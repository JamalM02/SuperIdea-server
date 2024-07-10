const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true,
    },
    fileData: {
        type: Buffer,
        required: true,
    },
    uploadedBy: {
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        fullName: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
        },
    },
    ideaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Idea',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    fileCount: {
        type: Number,
        required: true,
    },
});

module.exports = mongoose.model('File', FileSchema);
