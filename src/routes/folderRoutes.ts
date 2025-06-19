import { Router } from 'express';
import * as folderController from '../controllers/folderController';
import { protect } from '../middleware';
import { folderValidationRules } from '../validators/folderValidators';

const router = Router();

// All routes require authentication
router.use(protect);

// GET /api/folders - Get all folders
router.get('/', folderController.getFolders);

// POST /api/folders - Create a new folder
router.post('/', folderValidationRules.create, folderController.createFolder);

// GET /api/folders/:id - Get a single folder by ID
router.get('/:id', folderController.getFolderById);

// PATCH /api/folders/:id - Update a folder
router.patch('/:id', folderValidationRules.update, folderController.updateFolder);

// DELETE /api/folders/:id - Delete a folder
router.delete('/:id', folderValidationRules.delete, folderController.deleteFolder);

export default router;
