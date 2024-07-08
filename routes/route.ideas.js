// routes/route.ideas.js
const express = require('express');
const router = express.Router();
const Idea = require('../models/model.Idea');
const User = require('../models/model.User');
const Report = require('../models/model.Report');

// Get all ideas
router.get('/', async (req, res) => {
    try {
        const ideas = await Idea.find().populate('user', 'fullName type').populate('likes', 'fullName type');
        res.json(ideas);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new idea
router.post('/', async (req, res) => {
    const idea = new Idea({
        title: req.body.title,
        description: req.body.description,
        user: req.body.user,
    });

    try {
        const newIdea = await idea.save();
        await User.findByIdAndUpdate(req.body.user, { $inc: { totalIdeas: 1 } });

        const userType = req.body.user.type;

        if (userType === 'Student') {
            await Report.findOneAndUpdate(
                {},
                { $inc: { totalStudentIdeas: 1 }, updatedAt: Date.now() },
                { new: true, upsert: true }
            );
        } else if (userType === 'Teacher') {
            await Report.findOneAndUpdate(
                {},
                { $inc: { totalTeacherIdeas: 1 }, updatedAt: Date.now() },
                { new: true, upsert: true }
            );
        }

        res.status(201).json(newIdea);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Like or unlike an idea
router.post('/:id/like', async (req, res) => {
    try {
        const idea = await Idea.findById(req.params.id);
        if (!idea) {
            return res.status(404).json({ message: 'Idea not found' });
        }

        const userId = req.body.userId;
        const userIndex = idea.likes.indexOf(userId);

        if (userIndex !== -1) {
            // User already liked the idea, so remove the like
            idea.likes.splice(userIndex, 1);
            idea.likesCount -= 1;
            await User.findByIdAndUpdate(idea.user, { $inc: { totalLikes: -1 } });
        } else {
            // User has not liked the idea, so add the like
            idea.likes.push(userId);
            idea.likesCount += 1;
            await User.findByIdAndUpdate(idea.user, { $inc: { totalLikes: 1 } });
        }

        const updatedIdea = await idea.save();
        res.status(200).json(await updatedIdea.populate('likes', 'fullName type'));
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
