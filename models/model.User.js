const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        set: (email) => email.toLowerCase(),
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ['Student', 'Lecturer', 'Admin'],
        default: 'student',
        required: true,
    },
    hashedPassword: {
        type: String,
        required: function() {
            return !this.isGoogleUser;
        },
    },
    isGoogleUser: {
        type: Boolean,
        default: false,
    },
    isVerified: {
        type: Boolean,
        default: false,
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
    twoFactorSecret: {
        type: String,
        required: false,
    },
    isTwoFactorEnabled: {
        type: Boolean,
        default: false,
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
