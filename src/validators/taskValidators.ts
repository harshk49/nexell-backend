import { check, query } from 'express-validator';
import { TaskStatus, TaskPriority } from '../models/Task';
import User from '../models/User';

export const taskValidationRules = {
  create: [
    check('title')
      .trim()
      .notEmpty()
      .withMessage('Task title is required')
      .isLength({ max: 100 })
      .withMessage('Title cannot be more than 100 characters')
      .escape(),

    check('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description cannot be more than 2000 characters'),

    check('status')
      .optional()
      .isIn(Object.values(TaskStatus))
      .withMessage(`Status must be one of: ${Object.values(TaskStatus).join(', ')}`),

    check('priority')
      .optional()
      .isIn(Object.values(TaskPriority))
      .withMessage(`Priority must be one of: ${Object.values(TaskPriority).join(', ')}`),

    check('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid ISO 8601 date')
      .toDate(),

    check('assignedTo')
      .optional()
      .isArray()
      .withMessage('Assigned users must be an array')
      .custom(async (assignedTo: string[]) => {
        if (!assignedTo.length) return true;

        // Ensure all provided IDs are valid MongoDB ObjectIDs
        const validIds = assignedTo.every((id) => /^[0-9a-fA-F]{24}$/.test(id));
        if (!validIds) {
          throw new Error('One or more assigned user IDs are invalid');
        }

        // Validate users exist in database
        const users = await User.find({ _id: { $in: assignedTo } });
        if (users.length !== assignedTo.length) {
          throw new Error('One or more assigned users do not exist');
        }

        return true;
      }),

    check('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
      .custom((tags: string[]) => {
        if (tags.some((tag) => tag.length > 30)) {
          throw new Error('Tags cannot be more than 30 characters');
        }
        return true;
      }),

    check('organization').optional().isMongoId().withMessage('Invalid organization ID'),
  ],

  update: [
    check('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Task title cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Title cannot be more than 100 characters')
      .escape(),

    check('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description cannot be more than 2000 characters'),

    check('status')
      .optional()
      .isIn(Object.values(TaskStatus))
      .withMessage(`Status must be one of: ${Object.values(TaskStatus).join(', ')}`),

    check('priority')
      .optional()
      .isIn(Object.values(TaskPriority))
      .withMessage(`Priority must be one of: ${Object.values(TaskPriority).join(', ')}`),

    check('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid ISO 8601 date')
      .toDate(),

    check('assignedTo')
      .optional()
      .isArray()
      .withMessage('Assigned users must be an array')
      .custom(async (assignedTo: string[]) => {
        if (!assignedTo.length) return true;

        // Ensure all provided IDs are valid MongoDB ObjectIDs
        const validIds = assignedTo.every((id) => /^[0-9a-fA-F]{24}$/.test(id));
        if (!validIds) {
          throw new Error('One or more assigned user IDs are invalid');
        }

        // Validate users exist in database
        const users = await User.find({ _id: { $in: assignedTo } });
        if (users.length !== assignedTo.length) {
          throw new Error('One or more assigned users do not exist');
        }

        return true;
      }),

    check('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
      .custom((tags: string[]) => {
        if (tags.some((tag) => tag.length > 30)) {
          throw new Error('Tags cannot be more than 30 characters');
        }
        return true;
      }),

    check('organization').optional().isMongoId().withMessage('Invalid organization ID'),
  ],

  updateOrder: [
    check('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(Object.values(TaskStatus))
      .withMessage(`Status must be one of: ${Object.values(TaskStatus).join(', ')}`),

    check('orderIndex')
      .notEmpty()
      .withMessage('Order index is required')
      .isNumeric()
      .withMessage('Order index must be a number')
      .toInt(),
  ],

  queryFilters: [
    query('status')
      .optional()
      .custom((value: string) => {
        // Allow comma-separated values for multiple statuses
        if (value.includes(',')) {
          const statuses = value.split(',');
          const allValid = statuses.every((s: string) =>
            Object.values(TaskStatus).includes(s as TaskStatus)
          );
          if (!allValid) {
            throw new Error(`Status must be one of: ${Object.values(TaskStatus).join(', ')}`);
          }
          return true;
        }
        // Single value validation
        if (!Object.values(TaskStatus).includes(value as TaskStatus)) {
          throw new Error(`Status must be one of: ${Object.values(TaskStatus).join(', ')}`);
        }
        return true;
      }),

    query('assignedTo').optional().isMongoId().withMessage('Invalid assigned user ID'),

    query('dueDateStart')
      .optional()
      .isISO8601()
      .withMessage('Due date start must be a valid ISO 8601 date')
      .toDate(),

    query('dueDateEnd')
      .optional()
      .isISO8601()
      .withMessage('Due date end must be a valid ISO 8601 date')
      .toDate()
      .custom((dueDateEnd, { req }) => {
        if (
          req?.query?.dueDateStart &&
          new Date(dueDateEnd) < new Date(req.query.dueDateStart as string)
        ) {
          throw new Error('Due date end must be greater than or equal to due date start');
        }
        return true;
      }),

    query('priority')
      .optional()
      .custom((value: string) => {
        // Allow comma-separated values for multiple priorities
        if (value.includes(',')) {
          const priorities = value.split(',');
          const allValid = priorities.every((p: string) =>
            Object.values(TaskPriority).includes(p as TaskPriority)
          );
          if (!allValid) {
            throw new Error(`Priority must be one of: ${Object.values(TaskPriority).join(', ')}`);
          }
          return true;
        }
        // Single value validation
        if (!Object.values(TaskPriority).includes(value as TaskPriority)) {
          throw new Error(`Priority must be one of: ${Object.values(TaskPriority).join(', ')}`);
        }
        return true;
      }),

    query('tag').optional().isString().withMessage('Tag must be a string'),

    query('organization').optional().isMongoId().withMessage('Invalid organization ID'),

    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),

    query('sortBy')
      .optional()
      .isIn(['title', 'priority', 'dueDate', 'status', 'createdAt', 'updatedAt', 'orderIndex'])
      .withMessage('Invalid sort field'),

    query('sortDirection')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort direction must be either asc or desc'),

    query('search')
      .optional()
      .isString()
      .withMessage('Search query must be a string')
      .isLength({ min: 1 })
      .withMessage('Search query cannot be empty'),
  ],
};
