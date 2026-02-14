import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { authMiddleware, optionalAuthMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import connectionsRoutes from './routes/connections.js';
import coupleRoutes from './routes/couple.js';
import cardsRoutes from './routes/cards.js';
import userRoutes from './routes/user.js';
import suggestionsRoutes from './routes/suggestions.js';

// Load environment variables
// dotenv.config();

const app = express(); 
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);

// Protected API routes require authentication
app.use('/api/ai', authMiddleware, aiRoutes);

app.use('/api/connections', authMiddleware, connectionsRoutes);
app.use('/api/matches', authMiddleware, connectionsRoutes);

app.use('/api/cards', authMiddleware, cardsRoutes);

app.use('/api/couple', authMiddleware, coupleRoutes);

app.use('/api/notifications', authMiddleware, (req: Request, res: Response) => {
  res.status(501).json({ error: 'Notifications routes not yet implemented' });
});

app.use('/api/user', authMiddleware, userRoutes);

app.use('/api/suggestions', authMiddleware, suggestionsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  // Token will be validated in handlers
  socket.data.token = token;
  next();
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('[Socket.io] User connected:', socket.id);

  // Join couple room for real-time updates
  socket.on('join-couple', (coupleId: string) => {
    socket.join(`couple:${coupleId}`);
    console.log(`[Socket.io] User ${socket.id} joined couple room: ${coupleId}`);
  });

  // Leave couple room
  socket.on('leave-couple', (coupleId: string) => {
    socket.leave(`couple:${coupleId}`);
    console.log(`[Socket.io] User ${socket.id} left couple room: ${coupleId}`);
  });

  // Couple messaging
  socket.on('couple:message', (data: { coupleId: string; message: string }) => {
    io.to(`couple:${data.coupleId}`).emit('couple:message', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  });

  // Typing indicator
  socket.on('couple:typing', (data: { coupleId: string; isTyping: boolean }) => {
    io.to(`couple:${data.coupleId}`).emit('couple:typing', {
      ...data,
      userId: socket.id,
    });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log('[Socket.io] User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Socket.io] WebSocket server ready`);
});
