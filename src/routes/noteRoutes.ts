import { Router } from 'express';
import * as noteController from '../controllers/noteController';
import { protect } from '../middleware';
import { noteValidationRules } from '../validators/noteValidators';

const router = Router();

// All routes require authentication
router.use(protect);

// GET /api/notes - Get all notes with pagination and filtering
router.get('/', noteController.getNotes);

// POST /api/notes - Create a new note
router.post('/', noteValidationRules.create, noteController.createNote);

// GET /api/notes/:id - Get a single note by ID
router.get('/:id', noteController.getNoteById);

// PATCH /api/notes/:id - Update a note
router.patch('/:id', noteValidationRules.update, noteController.updateNote);

// DELETE /api/notes/:id - Delete a note
router.delete('/:id', noteController.deleteNote);

export default router;
