import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import { protect } from '../middleware';
import { extractOrg } from '../middleware/orgMiddleware';
import { taskValidationRules } from '../validators/taskValidators';

const router = Router();

// All routes require authentication
router.use(protect);

// Add organization context if provided, but don't require it
router.use(extractOrg);

// GET /api/tasks - Get all tasks with filtering, sorting, and pagination
router.get('/', taskValidationRules.queryFilters, taskController.getTasks);

// POST /api/tasks - Create a new task
router.post('/', taskValidationRules.create, taskController.createTask);

// GET /api/tasks/:id - Get a single task by ID
router.get('/:id', taskController.getTaskById);

// PATCH /api/tasks/:id - Update a task
router.patch('/:id', taskValidationRules.update, taskController.updateTask);

// PATCH /api/tasks/:id/order - Update a task's order
router.patch('/:id/order', taskValidationRules.updateOrder, taskController.updateTaskOrder);

// POST /api/tasks/rebalance - Rebalance task order indices
router.post('/rebalance', taskController.rebalanceTaskOrder);

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', taskController.deleteTask);

export default router;
