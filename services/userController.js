const User = require('../models/model.User');
const { sendEmail } = require('./emailService');
const bcrypt = require('bcryptjs');

const createAdminUser = async () => {
    try {
        const password = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(password, 10);

        const adminUser = new User({
            email: 'scholarsharenet@gmail.com',
            fullName: 'Admin',
            hashedPassword: hashedPassword,
            type: 'Admin',
            isVerified: true
        });

        await adminUser.save();


        await sendEmail('scholarsharenet@gmail.com', 'Admin Account Created', `Your password is: ${password}`);

        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Failed to create admin user:', error);
    }
};

module.exports = { createAdminUser };
