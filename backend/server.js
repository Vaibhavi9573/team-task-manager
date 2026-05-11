import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase, setDatabaseOffline } from './db.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import taskAdvancedRoutes from './routes/taskAdvanced.js';
import analyticsRoutes from './routes/analytics.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import { verifyToken } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/admin', verifyToken, adminRoutes);
app.use('/api/users', verifyToken, userRoutes);
app.use('/api/projects', verifyToken, projectRoutes);
app.use('/api/tasks', verifyToken, taskRoutes);
app.use('/api/analytics', verifyToken, analyticsRoutes);
app.use('/api/tasks-advanced', verifyToken, taskAdvancedRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize database and start server
async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ API: http://localhost:${PORT}`);
    });
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      setDatabaseOffline(true);
      console.warn('Database is not running, starting backend in limited mode.');
      app.listen(PORT, () => {
        console.log(`✓ Server running on port ${PORT}`);
        console.log(`✓ API: http://localhost:${PORT}`);
        console.log('⚠ Running in demo mode because PostgreSQL is offline. Auth and admin/member portals use in-memory sample data.');
      });
      return;
    }

    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
