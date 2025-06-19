import { format, createLogger, transports } from 'winston';
import morgan from 'morgan';
import { Request, Response } from 'express';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define Winston format
const formatOptions = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
);

// Define Winston transports
const logTransports = [
  new transports.Console({
    format: format.combine(format.colorize(), formatOptions),
  }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  // Don't directly push to logTransports array to avoid type issues
  // Add file transports separately
}

// Create Winston logger instance
export const logger = createLogger({
  level: level(),
  levels,
  format: formatOptions,
  transports: logTransports,
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
    })
  );
  logger.add(
    new transports.File({
      filename: 'logs/combined.log',
    })
  );
}

// Create Morgan middleware with appropriate format based on environment
export const morganMiddleware = () => {
  // Define Morgan format based on environment
  const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

  // In production, stream Morgan logs to Winston
  if (process.env.NODE_ENV === 'production') {
    return morgan(morganFormat, {
      stream: {
        write: (message: string) => {
          logger.http(message.trim());
        },
      },
    });
  }

  // In development, use standard Morgan
  return morgan(morganFormat);
};

// Helper methods for common logging scenarios
export const loggerMiddleware = (req: Request, _res: Response, next: Function) => {
  logger.http(`${req.method} ${req.originalUrl}`);
  next();
};
