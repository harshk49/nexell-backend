import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import User, { IUser } from '../models/User';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

// Define augmented Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

// Generate JWT Token
const generateToken = (id: string): string => {
  const secret = process.env.JWT_SECRET || 'your_jwt_secret_key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '90d';

  return jwt.sign({ id }, secret, { expiresIn });
};

// Send JWT response with cookie
const sendTokenResponse = (user: IUser, statusCode: number, res: Response): void => {
  // Create token
  const token = generateToken(user._id.toString());

  // Set cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRES_IN as string) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  // Set cookie
  res.cookie('token', token, cookieOptions);

  // Remove password from output
  user.password = '';

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation error', 400);
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      throw new AppError('Email already registered', 400);
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    // Send token response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation error', 400);
    }

    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    // Check if user exists & password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      throw new AppError('Invalid credentials', 401);
    }

    // Send token response
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // User is already available from auth middleware
    const user = await User.findById(req.user!._id);

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
export const logout = (req: Request, res: Response): void => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
    data: {},
  });
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get user based on email
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      throw new AppError('There is no user with that email', 404);
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();

    // Save the user with the new reset token fields
    await user.save({ validateBeforeSave: false });

    // In a real app, send email with reset token
    // For now, just log and return the token
    logger.info(`Password reset token: ${resetToken}`);

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
      // ONLY FOR DEVELOPMENT/TESTING - remove in production
      token: resetToken,
    });
  } catch (error) {
    // If there's an error, reset the token fields
    if (req.body.email) {
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
      }
    }
    next(error);
  }
};

// @desc    Reset password
// @route   PATCH /api/auth/resetpassword/:token
// @access  Public
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from params and hash it
    const resetToken = req.params.token;
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Find user with token that hasn't expired
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    // Check if user exists and token hasn't expired
    if (!user) {
      throw new AppError('Token is invalid or has expired', 400);
    }

    // Set new password
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Send token response
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PATCH /api/auth/updatepassword
// @access  Private
export const updatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get user from database
    const user = await User.findById(req.user!._id).select('+password');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if current password is correct
    const isPasswordMatch = await user.matchPassword(req.body.currentPassword);
    if (!isPasswordMatch) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Set new password
    user.password = req.body.newPassword;
    await user.save();

    // Send token response
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};
