import { Router } from 'express';
import * as timeLogController from '../controllers/timeLogController';
import { protect } from '../middleware';
import { extractOrg } from '../middleware/orgMiddleware';
import { timeLogValidationRules } from '../validators/timeLogValidators';

const router = Router();

// All routes require authentication
router.use(protect);

// Add organization context if provided, but don't require it
router.use(extractOrg);

// GET /api/time-logs - Get time logs with filtering and pagination
router.get('/', timeLogValidationRules.queryFilters, timeLogController.getTimeLogs);

// POST /api/time-logs/start - Start a new timer
router.post('/start', timeLogValidationRules.startTimer, timeLogController.startTimer);

// POST /api/time-logs/stop - Stop the active timer
router.post('/stop', timeLogValidationRules.stopTimer, timeLogController.stopTimer);

// GET /api/time-logs/active - Get the active timer
router.get('/active', timeLogController.getActiveTimer);

// POST /api/time-logs/manual - Create a manual time entry
router.post('/manual', timeLogValidationRules.createManual, timeLogController.createManualEntry);

// GET /api/time-logs/task/:taskId - Get time logs for a specific task
router.get('/task/:taskId', timeLogController.getTimeLogsByTask);

// GET /api/time-logs/statistics - Get time tracking statistics
router.get('/statistics', timeLogController.getTimeStatistics);

// PATCH /api/time-logs/:id - Update a time log
router.patch('/:id', timeLogValidationRules.update, timeLogController.updateTimeLog);

// DELETE /api/time-logs/:id - Delete a time log
router.delete('/:id', timeLogController.deleteTimeLog);

export default router;
