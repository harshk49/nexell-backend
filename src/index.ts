import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB, closeDB } from './config/db';
import { logger, morganMiddleware, loggerMiddleware } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { AppError } from './utils/AppError';

// Import routes
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';

// Load environment variables
dotenv.config();

// Create Express application
const app: Application = express();

// Set up middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS handling
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(morganMiddleware()); // HTTP request logging
app.use(loggerMiddleware); // Custom logging middleware

// Set up routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);

// Catch 404 and forward to error handler
app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// Error handling middleware
app.use(errorHandler);

// Get port from environment variables
const PORT = process.env.PORT || 3000;

// Start the server
const server = app.listen(PORT, async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  } catch (error: any) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.name}, ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught Exception: ${err.name}, ${err.message}`);
  // Exit process
  process.exit(1);
});

// Handle SIGTERM signal
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received.');
  logger.info('Closing HTTP server.');
  server.close(async () => {
    logger.info('HTTP server closed.');
    // Close database connection
    await closeDB();
    process.exit(0);
  });
});

// Handle SIGINT signal (Ctrl+C)
process.on('SIGINT', async () => {
  logger.info('SIGINT signal received.');
  logger.info('Closing HTTP server.');
  server.close(async () => {
    logger.info('HTTP server closed.');
    // Close database connection
    await closeDB();
    process.exit(0);
  });
});
