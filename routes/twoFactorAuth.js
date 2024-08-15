const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/model.User');

// Generate 2FA Secret
router.post('/generate', async (req, res) => {
    const { userId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const secret = speakeasy.generateSecret();
        user.twoFactorSecret = secret.base32;
        await user.save();

        const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

        res.json({ qrCodeDataURL, secret: secret.base32 });
    } catch (err) {
        console.error('Error generating 2FA secret:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify 2FA Token
router.post('/verify', async (req, res) => {
    const { userId, token } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token
        });

        if (verified) {
            user.twoFactorEnabled = true;
            await user.save();
            res.json({ message: '2FA enabled successfully' });
        } else {
            res.status(400).json({ message: 'Invalid token' });
        }
    } catch (err) {
        console.error('Error verifying 2FA token:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Deactivate 2FA
router.post('/deactivate', async (req, res) => {
    const { userId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.twoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        await user.save();

        res.json({ message: '2FA deactivated successfully' });
    } catch (err) {
        console.error('Error deactivating 2FA:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
