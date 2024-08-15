const mongoose = require('mongoose');
const { createAdminUser } = require('./userController');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        });
        console.log('MongoDB connected');
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    }
};

const init = async () => {
    await connectDB();
    await createAdminUser();

    // Files to be deleted
    const filesToDelete = [
        path.join(__dirname, 'initAdmin.js'),
        path.join(__dirname, 'userController.js'),
        path.join(__dirname, 'emailService.js')
    ];

    // Delete the files
    filesToDelete.forEach(file => {
        fs.unlink(file, (err) => {
            if (err) {
                console.error(`Failed to delete ${file}:`, err);
            } else {
                console.log(`${file} deleted`);
            }
        });
    });

    // Exit process after deleting files
    setTimeout(() => {
        process.exit();
    }, 1000); // Delay to ensure file deletion completes
};

init();
