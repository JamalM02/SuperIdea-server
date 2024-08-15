const User = require('../models/model.User');
const argon2 = require('argon2');
require('dotenv').config();

const createAdminUser = async () => {
    try {
        const plainPassword = process.env.ADMIN_PASSWORD;
        const adminEmail = process.env.ADMIN_EMAIL;

        if (!plainPassword) {
            throw new Error('ADMIN_PASSWORD not set in environment variables');
        }

        // Hash the password using Argon2
        const hashedPassword = await argon2.hash(plainPassword, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16, // 64 MB
            timeCost: 4,
            parallelism: 2,
        });

        // Check if the admin user already exists
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            // Update the existing admin user's password and email
            existingAdmin.hashedPassword = hashedPassword;
            existingAdmin.email = adminEmail;
            await existingAdmin.save();
            console.log('Admin user updated successfully');
        } else {
            // Create a new admin user
            const adminUser = new User({
                email: adminEmail,
                fullName: 'Admin',
                hashedPassword: hashedPassword,
                type: 'Admin',
                isVerified: true
            });

            await adminUser.save();
            console.log('Admin user created successfully');
        }
    } catch (error) {
        console.error('Failed to create or update admin user:', error);
    }
};

module.exports = { createAdminUser };
