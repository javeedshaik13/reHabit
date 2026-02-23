import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// try to load optional morgan logger
let morgan = null;
try {
  morgan = await import('morgan');
  morgan = morgan.default;
} catch (err) {
  console.warn('Optional dependency "morgan" not found. Install with "npm install morgan" to enable request logging.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// build MONGO_URI from env pieces if provided (useful to avoid committing credentials)
const {
  MONGO_URI: RAW_MONGO_URI,
  MONGO_USER,
  MONGO_PASS,
  MONGO_HOST,
  MONGO_DB
} = process.env;

let MONGO_URI = RAW_MONGO_URI || '';

// if separate pieces provided, construct a connection string
if (!MONGO_URI && MONGO_USER && MONGO_PASS && MONGO_HOST) {
  const db = MONGO_DB || 'rehabit';
  // prefer SRV style if host looks like a cluster host
  if (MONGO_HOST.includes('mongodb+srv') || MONGO_HOST.includes('cluster')) {
    MONGO_URI = `mongodb+srv://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}/${db}?retryWrites=true&w=majority`;
  } else {
    MONGO_URI = `mongodb://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}/${db}`;
  }
}

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
// In development reflect the request origin to avoid strict origin mismatches (useful for localhost testing).
// In production use configured CORS_ORIGIN (string or array).
const devReflectOrigin = process.env.NODE_ENV !== 'production';
const corsOptions = {
  origin: devReflectOrigin ? true : (Array.isArray(CORS_ORIGIN) ? CORS_ORIGIN : CORS_ORIGIN),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Use CORS middleware with the computed options. When origin === true, cors will echo back request Origin header.
app.use(cors(corsOptions));
// ensure preflight requests are handled
app.options('*', cors(corsOptions));

app.use(express.json());

// use morgan if available, otherwise a minimal fallback logger in dev
if (morgan) {
  app.use(morgan('dev'));
} else {
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${req.method} ${req.originalUrl}`);
    }
    next();
  });
}

const PORT = Number(process.env.PORT) || 4000;

// fail-fast: disable mongoose command buffering so operations error when no connection
mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', false); // optional, keep default behavior

async function connectDb() {
  // If no URI configured, fall back to in-memory DB for development
  if (!MONGO_URI) {
    console.warn('No MONGO_URI provided — attempting to start an in-memory MongoDB for development.');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to in-memory MongoDB');
      // expose the in-memory server so it can be stopped later if needed
      app.set('mongod', mongod);
      return;
    } catch (memErr) {
      console.error('Failed to start in-memory MongoDB:', memErr && memErr.message);
      return; // continue without DB
    }
  }

  try {
    // set a reasonable server selection timeout so failures surface quickly
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (err) {
    // improve error messages for common issues
    console.warn('MongoDB connection failed:', err && err.message);

    // If connection fails (e.g., ETIMEDOUT, auth issues), attempt an in-memory fallback so dev can continue
    try {
      console.warn('Attempting to start an in-memory MongoDB as a fallback...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to in-memory MongoDB (fallback)');
      app.set('mongod', mongod);
    } catch (memErr) {
      console.error('Failed to start in-memory MongoDB fallback:', memErr && memErr.message);
      if (/auth|bad auth|Authentication failed/i.test(err.message)) {
        console.warn('MongoDB authentication failed. Check MONGO_URI or MONGO_USER/MONGO_PASS in server/.env.');
        console.warn('If you intended to run locally, set MONGO_URI=mongodb://127.0.0.1:27017/rehabit (start a local mongod).');
      }
      // leave process running without DB (app uses sample data)
    }
  }
}

// log mongoose connection events to help debugging
mongoose.connection.on('connected', () => console.log('Mongoose connection state: connected'));
mongoose.connection.on('error', (err) => console.error('Mongoose connection error:', err && err.message));
mongoose.connection.on('disconnected', () => console.warn('Mongoose connection state: disconnected'));

async function gatherAnalytics() {
  const defaults = {
    total_users: 0,
    total_habits: 0,
    total_communities: 0,
    total_completions: 0,
  };

  try {
    const promises = [
      User.countDocuments().exec(),
      Habit.countDocuments().exec(),
      Community.countDocuments().exec(),
      Completion.countDocuments().exec(),
    ];

    const [total_users, total_habits, total_communities, total_completions] = await Promise.all(promises);

    return { total_users, total_habits, total_communities, total_completions };
  } catch (err) {
    console.error('Error gathering analytics:', err.message);
    return defaults;
  }
}

// Import models for analytics
import User from './models/User.js';
import Habit from './models/Habit.js';
import Community from './models/Community.js';
import Completion from './models/Completion.js';

// Import routes
import authRoutes from './routes/auth.js';
import habitRoutes from './routes/habits.js';
import communityRoutes from './routes/communities.js';
import challengeRoutes from './routes/challenges.js';
import mentorRoutes from './routes/mentor.js';
import adminRoutes from './routes/admin.js';
import badgesRoutes from './routes/badges.js';
import userRoutes from './routes/users.js';
import leaderboardRoutes from './routes/leaderboard.js';
import aiRoutes from './routes/ai.js';
import postRoutes from './routes/posts.js';
import socialRoutes from './routes/social.js';
import mentorPlanRoutes from './routes/mentorPlans.js';
import chatRoutes from './routes/chat.js';
import gamificationRoutes from './routes/gamification.js';
import levelRoutes from './routes/levels.js';
import worldRoutes from './routes/worlds.js';
import friendsRoutes from './routes/friends.js';
import messagesRoutes from './routes/messages.js';

// Mount routes (use the imported ESM route variables — do not re-require)
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/mentors', mentorRoutes);
// backward-compatible alias
app.use('/api/mentor', mentorRoutes);
app.use('/api/mentor-plans', mentorPlanRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/worlds', worldRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/messages', messagesRoutes);

// Create HTTP server for Socket.IO
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: devReflectOrigin ? true : CORS_ORIGIN,
    credentials: true
  }
});

// expose io on express app so controllers can emit without circular imports
app.set('io', io);

// API route for admin analytics
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const data = await gatherAnalytics();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

// Basic health endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// global error handler (should be after routes)
app.use((err, req, res, next) => {
  console.error('Unhandled route/middleware error:', err.stack || err);
  res.status(500).json({ message: err.message || 'Internal Server Error', error: err.message });
});

// log unhandled rejections / uncaught exceptions to aid debugging
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err.stack || err);
  // in production you might process.exit(1) after cleanup
});

// Socket.IO connection handling
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user_online', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.broadcast.emit('user_status', { userId, status: 'online' });
  });

  socket.on('join_chat', ({ userId, otherUserId }) => {
    const room = [userId, otherUserId].sort().join('_');
    socket.join(room);
    console.log(`User ${userId} joined room ${room}`);
  });

  socket.on('send_message', (data) => {
    const room = [data.senderId, data.receiverId].sort().join('_');
    io.to(room).emit('receive_message', data);
  });

  socket.on('typing', ({ senderId, receiverId }) => {
    const room = [senderId, receiverId].sort().join('_');
    socket.to(room).emit('user_typing', { userId: senderId });
  });

  socket.on('stop_typing', ({ senderId, receiverId }) => {
    const room = [senderId, receiverId].sort().join('_');
    socket.to(room).emit('user_stop_typing', { userId: senderId });
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        socket.broadcast.emit('user_status', { userId, status: 'offline' });
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// Start server with a small port-fallback strategy to avoid crashing on EADDRINUSE
async function startServer(preferredPort = PORT, maxRetries = 5) {
  let port = preferredPort;
  const tryListen = () => {
    httpServer.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      console.log(`CORS origin allowed: ${CORS_ORIGIN}`);
      console.log(`Socket.IO ready for connections`);
    });

    httpServer.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} in use.`);
        if (port < preferredPort + maxRetries) {
          port += 1;
          console.warn(`Trying port ${port}...`);
          setTimeout(tryListen, 200);
          return;
        }
      }
      console.error('Server failed to start:', err);
      process.exit(1);
    });
  };

  tryListen();
}

connectDb().then(() => startServer()).catch((err) => {
  console.error('Failed to connect DB or start server:', err);
});

export { io };
export default app;
