const User = require('../models/model.User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const createAdminUser = async () => {
    try {
        const plainPassword = process.env.ADMIN_PASSWORD;
        if (!plainPassword) {
            throw new Error('ADMIN_PASSWORD not set in environment variables');
        }

        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const adminUser = new User({
            email: 'scholarsharenet@gmail.com',
            fullName: 'Admin',
            hashedPassword: hashedPassword,
            type: 'Admin',
            isVerified: true
        });

        await adminUser.save();

        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Failed to create admin user:', error);
    }
};

module.exports = { createAdminUser };
