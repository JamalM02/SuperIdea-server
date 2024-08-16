const express = require('express');
const router = express.Router();
const argon2 = require('argon2');
const User = require('../models/model.User');
const Idea = require('../models/model.Idea');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

// Login route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email: email.toLowerCase() });  // Convert email to lowercase
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if the account is currently locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const unlockTime = new Date(user.lockUntil).toLocaleString();
            return res.status(423).json({ message: `Account is locked. Try again after ${unlockTime}.` });
        }

        // Verify the password using Argon2
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

        // Reset login attempts and lockUntil on successful login
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Register a new user
router.post('/register', async (req, res) => {
    let { fullName, email, password, type } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    try {
        // Check if the email is already registered
        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        // Check if the name is already registered
        const existingUserByName = await User.findOne({ fullName });
        if (existingUserByName) {
            return res.status(400).json({ message: 'Name is already registered' });
        }

        // Hash the password using Argon2 with custom parameters
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
            isVerified: true
        });

        const newUser = await user.save();
        res.status(201).json(newUser);
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(400).json({ message: err.message });
    }
});

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
        // Fetch users with at least one post and one like
        const eligibleUsers = await User.find({ totalIdeas: { $gt: 0 }, totalLikes: { $gt: 0 } })
            .sort({ totalLikes: -1, totalIdeas: -1 })
            .limit(3)
            .select('fullName type totalLikes totalIdeas topContributor');

        // Update topContributor field
        await User.updateMany({}, { topContributor: false }); // Reset all topContributor fields
        await User.updateMany({ _id: { $in: eligibleUsers.map(user => user._id) } }, { topContributor: true });

        res.json(eligibleUsers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Verify email
router.post('/verify', async (req, res) => {
    const { email, code } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid email' });
        }

        if (user.verificationCode === code) {
            user.isVerified = true;
            user.verificationCode = undefined; // Remove the code after verification
            await user.save();
            res.json({ success: true, message: 'Email verified successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid verification code' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// Check if email or name exists
router.post('/checkExistence', async (req, res) => {
    const { email, fullName } = req.body;

    try {
        const existingUserByEmail = await User.findOne({ email });
        const existingUserByName = await User.findOne({ fullName });

        if (existingUserByEmail) {
            return res.status(400).json({ field: 'email', message: 'Email is already registered' });
        }

        if (existingUserByName) {
            return res.status(400).json({ field: 'fullName', message: 'Name is already registered' });
        }

        res.status(200).json({ message: 'OK' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Route to fetch all users except Admin
router.get('/', async (req, res) => {
    try {
        const users = await User.find({email: { $ne: process.env.ADMIN_EMAIL }
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching non-admin users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to change user type
router.put('/change-type/:userId', async (req, res) => {
    const { userId } = req.params;
    const { type } = req.body;

    if (!['Student', 'Lecturer', 'Admin'].includes(type)) {
        return res.status(400).json({ message: 'Invalid user type' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.type = type;
        await user.save();
        res.json({ message: 'User type updated successfully' });
    } catch (error) {
        console.error('Error updating user type:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Enable 2FA
router.post('/enable-2fa', async (req, res) => {
    const { userId, password, token } = req.body;
    if (!userId || !password || !token) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isValidPassword = await argon2.verify(user.hashedPassword, password);
        if (!isValidPassword) {
            console.error('Invalid password for user:', userId);
            return res.status(400).json({ message: 'Invalid password' });
        }

        const isVerified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
        });

        if (!isVerified) {
            console.error('Invalid 2FA token', { secret: user.twoFactorSecret, token });
            return res.status(400).json({ message: 'Invalid 2FA token' });
        }

        user.isTwoFactorEnabled = true;
        await user.save();

        res.json({ message: '2FA enabled' });
    } catch (error) {
        console.error('Error enabling 2FA:', error);
        res.status(500).json({ message: error.message });
    }
});

// Generate 2FA QR Code
router.post('/generate-2fa', async (req, res) => {
    const { userId, password } = req.body;
    if (!userId || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isValidPassword = await argon2.verify(user.hashedPassword, password);
        if (!isValidPassword) {
            console.error('Invalid password for user:', userId);
            return res.status(400).json({ message: 'Invalid password' });
        }

        // Set the account name similar to the "Heroku" example
        const serviceName = process.env.SERVICE_NAME;
        const accountName = user.fullName; // This will appear under the service name
        const secret = speakeasy.generateSecret({
            name: `${serviceName}:${accountName}`,
            issuer: serviceName
        });

        user.twoFactorSecret = secret.base32;
        await user.save();

        // Generate a moderately complex QR code
        QRCode.toDataURL(secret.otpauth_url, {
            width: 300, // Moderate width for a detailed yet scannable QR code
            errorCorrectionLevel: 'H', // High error correction for some redundancy
            margin: 2, // Small margin to ensure better focus
            scale: 8, // Moderate scale to add some detail without overcomplicating
        }, (err, data_url) => {
            if (err) {
                console.error('Error generating QR code:', err);
                return res.status(500).json({ message: 'Error generating QR code' });
            }
            res.json({ qrCode: data_url, secret: secret.base32 });
        });
    } catch (error) {
        console.error('Error generating 2FA QR code:', error);
        res.status(500).json({ message: error.message });
    }
});

router.post('/verify-2fa', async (req, res) => {
    const { userId, token } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret, // Ensure this is stored securely
            encoding: 'base32',
            token,
        });

        if (verified) {
            return res.json({ success: true });
        } else {
            return res.status(400).json({ success: false, message: 'Invalid 2FA token' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Disable 2FA
router.post('/disable-2fa', async (req, res) => {
    const { userId, password, token } = req.body;

    if (!userId || !password || !token) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isValidPassword = await argon2.verify(user.hashedPassword, password);
        if (!isValidPassword) {
            console.error('Invalid password for user:', userId);
            return res.status(400).json({ message: 'Invalid password' });
        }

        const isVerified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
        });

        if (!isVerified) {
            console.error('Invalid 2FA token for disabling 2FA', { userId, token });
            return res.status(400).json({ message: 'Invalid 2FA token' });
        }

        user.twoFactorSecret = undefined;
        user.isTwoFactorEnabled = false;
        await user.save();

        res.json({ message: '2FA disabled' });
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        res.status(500).json({ message: error.message });
    }
});

// Route to check 2FA status
router.get('/:userId/2fa-status', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('isTwoFactorEnabled');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ is2FAEnabled: user.isTwoFactorEnabled });
    } catch (error) {
        console.error('Error checking 2FA status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
