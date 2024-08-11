// models/model.User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    hashedPassword: {
        type: String,
        required: true,
    },
    loginAttempts: {
        type: Number,
        required: true,
        default: 0,
    },
    lockUntil: {
        type: Number,
    },
    totalIdeas: {
        type: Number,
        default: 0,
    },
    totalLikes: {
        type: Number,
        default: 0,
    },
    topContributor: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

module.exports = mongoose.model('User', userSchema);

