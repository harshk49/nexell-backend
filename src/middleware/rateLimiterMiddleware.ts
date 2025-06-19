import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiter middleware for sensitive routes
 * Limits the number of requests from the same IP address
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  handler: (req: Request, res: Response): void => {
    res.status(429).json({
      status: 'fail',
      message: 'Too many requests from this IP, please try again after 15 minutes',
    });
  },
  keyGenerator: (req: Request): string => {
    return req.ip || '';
  },
  skip: (_req: Request, _res: Response): boolean => {
    return false; // Don't skip any requests
  },
});

/**
 * Creates a custom rate limiter with configurable options
 */
export const createRateLimiter = (
  windowMs = 60 * 60 * 1000, // default: 1 hour
  max = 100, // default: 100 requests per windowMs
  message = 'Too many requests, please try again later'
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      status: 'fail',
      message,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
