import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
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

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177'
    ];

    const isRailwayOrigin = typeof origin === 'string' && origin.endsWith('.up.railway.app');

    if (!origin || allowedOrigins.includes(origin) || isRailwayOrigin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

// Middleware
app.use(express.json());

// Serve frontend static files FIRST (before API routes)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.join(__dirname, 'public');

// Log requests for debugging in deploy logs (helps diagnose 500s on assets)
app.use((req, res, next) => {
  console.log(`REQ ${req.method} ${req.url}`);
  next();
});

// Serve static assets from backend/public (no SPA index handling here)
// Robust asset streaming handler (avoid express.static for predictable logs)
app.get('/assets/*', (req, res) => {
  const relPath = req.path.replace(/^\//, '');
  const filePath = path.join(frontendDist, relPath);

  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (err) {
    console.error('ASSET_MISSING', filePath, err && err.message);
    return res.status(404).send('Not found');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.js': 'application/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.html': 'text/html; charset=UTF-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.map': 'application/json'
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    console.error('STREAM_ERROR', filePath, err && err.message);
    if (!res.headersSent) res.status(500).send('Server error');
  });
  stream.pipe(res);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply CORS to API routes only (avoids blocking static JS/CSS with 500)
app.use('/api', cors(corsOptions));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/admin', verifyToken, adminRoutes);
app.use('/api/users', verifyToken, userRoutes);
app.use('/api/projects', verifyToken, projectRoutes);
app.use('/api/tasks', verifyToken, taskRoutes);
app.use('/api/analytics', verifyToken, analyticsRoutes);
app.use('/api/tasks-advanced', verifyToken, taskAdvancedRoutes);

// Serve index.html for all unmatched routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

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
