import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

import { errorHandler, notFound } from './middleware/errorHandler';
import { validateConfig } from './middleware/validation';
import performanceRoutes from './routes/performance';
import tradesRoutes from './routes/trades';
import configRoutes from './routes/config';
import optimizationRoutes from './routes/optimization';
import { WebSocketManager } from './services/websocket';
import { DatabaseService } from './services/database';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Environment configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const BOT_ROOT_PATH = process.env.BOT_ROOT_PATH || path.join(__dirname, '../../../');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// General middleware
app.use(compression());
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

// API routes
app.use('/api/performance', performanceRoutes);
app.use('/api/trades', tradesRoutes);
app.use('/api/config', validateConfig, configRoutes);
app.use('/api/optimization', optimizationRoutes);

// WebSocket setup
const wsManager = new WebSocketManager(io, BOT_ROOT_PATH);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize database service
const dbService = new DatabaseService(BOT_ROOT_PATH);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Drift E3 Dashboard API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🔗 Bot root path: ${BOT_ROOT_PATH}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
  
  // Initialize WebSocket monitoring
  wsManager.startMonitoring();
});

export { app, server, io };
