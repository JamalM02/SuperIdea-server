const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const cron = require('node-cron');
const User = require('../models/model.User'); // Import User model here
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'https://scholarsharenet.vercel.app'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});

const PORT = process.env.PORT || 5000;

// Configure CORS
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = ['http://localhost:3000', 'https://scholarsharenet.vercel.app'];
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}));

// Middleware
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });

// Define routes
const userRoutes = require('../routes/route.users');
const ideaRoutes = require('../routes/route.ideas');
const reportRoutes = require('../routes/route.reports');

app.use('/api/users', userRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Handle the root route
app.get('/', (req, res) => {
    res.send('Welcome to the ScholarShareNet API');
});

// Socket.IO event handling
io.on('connection', (socket) => {
    socket.on('newIdea', (idea) => {
        io.emit('newIdea', idea);
    });

    socket.on('likeIdea', (likeData) => {
        io.emit('likeIdea', likeData);
    });

    socket.on('disconnect', () => {
        //console.log('User disconnected');
    });
});

const calculateScore = (user) => {
    const weightIdeas = process.env.WEIGHTIDEAS/100;
    const weightLikes = process.env.WEIGHTLIKES/100;
    const weightRating = process.env.WEIGHTRATING/100;

    return (user.totalIdeas * weightIdeas) +
        (user.totalLikes * weightLikes) +
        (user.totalRatings * weightRating);
};

const updateScoresAndTopContributors = async () => {
    try {
        const users = await User.find({ totalIdeas: { $gt: 0 }, totalLikes: { $gt: 0 } });

        // Calculate and update score for each user
        const usersWithScores = await Promise.all(users.map(async (user) => {
            let score = calculateScore(user);
            score = parseFloat(score.toFixed(1)); // Format score to one decimal place
            await User.findByIdAndUpdate(user._id, { score });
            return { ...user._doc, score };  // Return user data with score for further sorting
        }));

        // Filter users with a minimum score of 1
        const eligibleUsers = usersWithScores.filter(user => user.score >= 1);

        // Sort eligible users by score in descending order and select the top 3
        const top3Users = eligibleUsers
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        // Reset topContributor field for all users
        await User.updateMany({}, { topContributor: false });

        // Set topContributor: true for the top 3 users by IDs
        await User.updateMany(
            { _id: { $in: top3Users.map(user => user._id) } },
            { topContributor: true }
        );

        console.log('Scores updated for all users and top contributors set for the top 3 with minimum score 1');
    } catch (err) {
        console.error('Error updating scores and top contributors:', err);
    }
};

cron.schedule(process.env.UPDATESCHADULE, updateScoresAndTopContributors);


// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
