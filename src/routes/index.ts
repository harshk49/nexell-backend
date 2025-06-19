import { Router } from 'express';
import authRoutes from './authRoutes';
import noteRoutes from './noteRoutes';
import folderRoutes from './folderRoutes';
import taskRoutes from './taskRoutes';
import organizationRoutes from './organizationRoutes';

const router = Router();

// Mount the routes
router.use('/auth', authRoutes);
router.use('/notes', noteRoutes);
router.use('/folders', folderRoutes);
router.use('/tasks', taskRoutes);
router.use('/organizations', organizationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
  });
});

export default router;
