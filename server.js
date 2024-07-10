const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
require('dotenv').config(); // Ensure this line is present if you're using .env for local development

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'https://superidea-react.vercel.app', 'https://superdemo-lake.vercel.app'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});
const PORT = process.env.PORT || 5000;

// Configure CORS
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = ['http://localhost:3000', 'https://superidea-react.vercel.app', 'https://superdemo-lake.vercel.app'];
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
app.use('/uploads', express.static('uploads')); // Serve static files from the uploads directory

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });

// Define routes
const userRoutes = require('./routes/route.users');
const ideaRoutes = require('./routes/route.ideas');
const reportRoutes = require('./routes/route.reports');

app.use('/api/users', userRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/reports', reportRoutes);

// Handle the root route
app.get('/', (req, res) => {
    res.send('Welcome to the Super Idea API');
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
