const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectDB = require('./config/database');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');

const app = express();

// . FIX #1: TRUST PROXY FIRST (BEFORE rate limiting)
app.set('trust proxy', 1);  // Render.com proxy

// . Security middleware (AFTER trust proxy)
app.use(helmet());
app.use(compression());
app.use(cookieParser());

// . Rate limiting (NOW works with real IPs)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // safer for free tier
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests. Please slow down.',
      retryAfter: '15 minutes'
    });
  }
});

app.use('/api', apiLimiter);

// . CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// . Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// . Static files for uploaded documents
app.use('/uploads', express.static('uploads'));

// . Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);

// . Log Cloudinary env presence at startup (safe booleans)
// console.log('Cloudinary env presence at startup:', {
//   CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
//   CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
//   CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET
// });

// . Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Task Manager API is running',
    timestamp: new Date().toISOString()
  });
});

// . Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// . 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// . MongoDB connection
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
