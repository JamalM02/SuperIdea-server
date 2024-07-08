// models/model.Idea.js
const mongoose = require('mongoose');

const IdeaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.Mixed, // You can specify the user schema type based on your user schema
        required: true,
    },
    /*
    user: {
        type: mongoose.Schema.Types.ObjectId,///***********
        ref: 'User',
        required: true,
    },

    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
     */
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    likesCount: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

IdeaSchema.index({ createdAt: 1 }); // Index for faster sorting by creation date

module.exports = mongoose.model('Idea', IdeaSchema);
