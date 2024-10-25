const express = require('express');
const router = express.Router();
const Idea = require('../models/model.Idea');
const User = require('../models/model.User');
const File = require('../models/model.File');  // Or your custom file model
const multer = require('multer');
const Report = require('../models/model.Report');
const AdmZip = require('adm-zip');
const upload = multer({ storage: multer.memoryStorage() });  // In-memory storage

// Get all ideas with metadata
router.get('/', async (req, res) => {
    try {
        const ideas = await Idea.find()
            .populate('user', 'fullName type topContributor')
            .populate('files', 'fileName fileCount createdAt') // Only fetch metadata
            .populate('likes', 'fullName type');

        res.json(ideas);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Fetch actual file data on download
router.get('/files/:id', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }
        res.set('Content-Disposition', `attachment; filename="${file.fileName}"`);
        res.set('Content-Type', 'application/octet-stream');
        res.send(file.fileData);
    } catch (err) {
        console.error('Error fetching file:', err);
        res.status(500).json({ message: 'Error fetching file' });
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
                { $inc: { totalTeacherIdeas: 1 }, updatedAt: Date.now() }
            );
        }

        if (req.files && req.files.length > 0) {
            const zip = new AdmZip();
            req.files.forEach(file => {
                zip.addFile(file.originalname, file.buffer);
            });
            const zipBuffer = zip.toBuffer();

            const zipFileName = `${idea.title.replace(/\s+/g, '_')}.zip`; // Replace spaces with underscores

            const newFile = new File({
                fileName: zipFileName,
                fileData: zipBuffer,
                fileCount: req.files.length,
                uploadedBy: existingUser,
                ideaId: newIdea._id,
            });
            await newFile.save();
            newIdea.files.push(newFile._id);
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
        const user = await User.findById(userId);
        if (user.type === 'Lecturer') {
            return res.status(400).json({ message: 'Lecturers should use the rating system.' });
        }
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
            await User.findByIdAndUpdate(idea.user._id, { $inc: { totalLikes: -1 } });
        } else {
            // User has not liked the idea, so add the like
            idea.likes.push(userId);
            idea.likesCount += 1;
            await User.findByIdAndUpdate(idea.user._id, { $inc: { totalLikes: 1 } });
        }

        const updatedIdea = await idea.save();
        const populatedIdea = await Idea.findById(updatedIdea._id)
            .populate('user', 'fullName type')
            .populate('likes', 'fullName type')
            .populate('files')
            .lean();
        res.status(200).json(populatedIdea);
    } catch (err) {
        console.error('Error in like/unlike idea:', err);
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to get contents of a ZIP file
router.get('/files/:fileId/contents', async (req, res) => {
    try {
        const file = await File.findById(req.params.fileId);
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        const zip = new AdmZip(file.fileData);
        const zipEntries = zip.getEntries();
        const fileList = zipEntries.map(entry => entry.entryName.toString('utf8'));

        res.json(fileList);
    } catch (err) {
        console.error('Error getting ZIP contents:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/:id/rate', async (req, res) => {
    const { userId, rating } = req.body;

    // Ensure the rating is between 1 and 5
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    try {
        const idea = await Idea.findById(req.params.id);
        if (!idea) return res.status(404).json({ message: 'Idea not found' });

        // Find if the lecturer has already rated
        const existingRatingIndex = idea.ratings.findIndex(r => r.userId.toString() === userId);

        if (existingRatingIndex !== -1) {
            // Update existing rating, adjust totalRatings by removing old value first
            idea.totalRatings -= idea.ratings[existingRatingIndex].rating;
            idea.ratings[existingRatingIndex].rating = rating;
        } else {
            // Add new rating and increment ratingCount
            idea.ratings.push({ userId, rating });
            idea.ratingCount += 1;
        }

        // Update total ratings by adding the new rating value
        idea.totalRatings += rating;

        await idea.save();

        // Repopulate necessary fields, including files and user info
        const updatedIdea = await Idea.findById(idea._id)
            .populate('user', 'fullName type')
            .populate('files', 'fileName fileCount createdAt');

        res.json(updatedIdea); // Send back fully populated idea with updated ratings
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});





module.exports = router;
