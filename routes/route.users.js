// routes/route.users.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const argon2 = require('argon2');
const User = require('../models/model.User');
const Idea = require('../models/model.Idea');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

// Register a new user
router.post('/register', async (req, res) => {
    const { fullName, email, password, type } = req.body;

    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    try {
        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        const existingUserByName = await User.findOne({ fullName });
        if (existingUserByName) {
            return res.status(400).json({ message: 'Name is already registered' });
        }

        const hashedPassword = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16, // 64 MB
            timeCost: 4,
            parallelism: 2,
        });

        const user = new User({
            fullName,
            email,
            hashedPassword,
            type,
        });

        const newUser = await user.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Login a user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (user.lockUntil && user.lockUntil > Date.now()) {
            const unlockTime = new Date(user.lockUntil).toLocaleString();
            return res.status(423).json({ message: `Account is locked. Try again after ${unlockTime}.` });
        }

        const validPassword = await argon2.verify(user.hashedPassword, password);
        if (!validPassword) {
            user.loginAttempts += 1;
            if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                user.lockUntil = Date.now() + LOCK_TIME;
                await user.save();
                const unlockTime = new Date(user.lockUntil).toLocaleString();
                return res.status(423).json({ message: `Account is locked due to multiple failed login attempts. Try again after ${unlockTime}.` });
            }
            await user.save();
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Google OAuth login route
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/user-account');
    }
);

// Get user achievements
router.get('/achievements/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('totalIdeas totalLikes topContributor');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get user ideas
router.get('/:userId/ideas', async (req, res) => {
    try {
        const ideas = await Idea.find({ 'user._id': req.params.userId })
            .select('title likesCount likes')
            .populate('likes', 'fullName type');
        if (!ideas) {
            return res.status(404).json({ message: 'No ideas found for this user' });
        }
        res.json(ideas);
    } catch (err) {
        console.error('Error fetching user ideas:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// Get top contributors
router.get('/top-contributors', async (req, res) => {
    try {
        const topContributors = await User.find()
            .sort({ totalLikes: -1, totalIdeas: -1 })
            .limit(3)
            .select('fullName type totalLikes totalIdeas topContributor');

        await User.updateMany({}, { topContributor: false });
        await User.updateMany({ _id: { $in: topContributors.map(contributor => contributor._id) } }, { topContributor: true });

        res.json(topContributors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
