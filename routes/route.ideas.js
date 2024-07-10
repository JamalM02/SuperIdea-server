const express = require('express');
const router = express.Router();
const Idea = require('../models/model.Idea');
const User = require('../models/model.User');
const Report = require('../models/model.Report');
const File = require('../models/model.File');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Get all ideas
router.get('/', async (req, res) => {
    try {
        const ideas = await Idea.find().populate('user', 'fullName type').populate('likes', 'fullName type').populate('files');
        res.json(ideas);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new idea
router.post('/', upload.array('files', 10), async (req, res) => {
    try {
        const user = JSON.parse(req.body.user);
        const existingUser = await User.findById(user._id).select('_id fullName type');
        if (!existingUser) {
            return res.status(400).json({ message: 'User not found' });
        }


        const idea = new Idea({
            title: req.body.title,
            description: req.body.description,
            user: existingUser,
        });

        const newIdea = await idea.save();
        await User.findByIdAndUpdate(user._id, { $inc: { totalIdeas: 1 } });

        if (user.type === 'Student') {
            await Report.findOneAndUpdate(
                {},
                { $inc: { totalStudentIdeas: 1 }, updatedAt: Date.now() },
                { new: true, upsert: true }
            );
        } else if (user.type === 'Teacher') {
            await Report.findOneAndUpdate(
                {},
                { $inc: { totalTeacherIdeas: 1 }, updatedAt: Date.now() },
                { new: true, upsert: true }
            );
        }

        if (req.files && req.files.length > 0) {
            const filePromises = req.files.map(file => {
                const newFile = new File({
                    fileName: file.originalname,
                    fileUrl: `/uploads/${file.filename}`,
                    uploadedBy: existingUser,
                    ideaId: newIdea._id,
                });
                return newFile.save();
            });

            const savedFiles = await Promise.all(filePromises);
            newIdea.files = savedFiles.map(file => file._id);
            await newIdea.save();
        }

        res.status(201).json(newIdea);
    } catch (err) {
        console.error('Error creating idea:', err);
        res.status(400).json({ message: err.message });
    }
});

// Like or unlike an idea
router.post('/:id/like', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const idea = await Idea.findById(req.params.id);
        if (!idea) {
            return res.status(404).json({ message: 'Idea not found' });
        }

        const userIndex = idea.likes.indexOf(userId);

        if (userIndex !== -1) {
            // User already liked the idea, so remove the like
            idea.likes.splice(userIndex, 1);
            idea.likesCount -= 1;
            await User.findByIdAndUpdate(userId, { $inc: { totalLikes: -1 } });
        } else {
            // User has not liked the idea, so add the like
            idea.likes.push(userId);
            idea.likesCount += 1;
            await User.findByIdAndUpdate(userId, { $inc: { totalLikes: 1 } });
        }

        const updatedIdea = await idea.save();
        const populatedIdea = await Idea.findById(updatedIdea._id).populate('user', 'fullName type').populate('likes', 'fullName type').populate('files').lean();
        res.status(200).json(populatedIdea);
    } catch (err) {
        console.error('Error in like/unlike idea:', err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
