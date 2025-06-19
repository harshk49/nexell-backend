import { Router } from 'express';
import { check } from 'express-validator';
import * as authController from '../controllers/authController';
import { protect, rateLimiter } from '../middleware';

const router = Router();

// Register user
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty().trim(),
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('password', 'Password must be at least 8 characters long').isLength({ min: 8 }),
  ],
  authController.register
);

// Login user
router.post(
  '/login',
  rateLimiter,
  [
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('password', 'Password is required').not().isEmpty(),
  ],
  authController.login
);

// Get current user
router.get('/me', protect, authController.getCurrentUser);

// Logout user
router.get('/logout', authController.logout);

// Forgot password
router.post(
  '/forgotpassword',
  [check('email', 'Please include a valid email').isEmail().normalizeEmail()],
  authController.forgotPassword
);

// Reset password
router.patch(
  '/resetpassword/:token',
  [check('password', 'Password must be at least 8 characters long').isLength({ min: 8 })],
  authController.resetPassword
);

// Update password
router.patch(
  '/updatepassword',
  protect,
  [
    check('currentPassword', 'Current password is required').not().isEmpty(),
    check('newPassword', 'New password must be at least 8 characters long').isLength({ min: 8 }),
  ],
  authController.updatePassword
);

export default router;
