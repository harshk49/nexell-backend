import { check } from 'express-validator';

export const noteValidationRules = {
  create: [
    check('title')
      .trim()
      .notEmpty()
      .withMessage('Note title is required')
      .isLength({ max: 100 })
      .withMessage('Title cannot be more than 100 characters')
      .escape(),

    check('content').trim().notEmpty().withMessage('Note content is required'),

    check('folder').optional().isMongoId().withMessage('Invalid folder ID'),

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
  ],

  update: [
    check('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Note title cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Title cannot be more than 100 characters')
      .escape(),

    check('content').optional().trim().notEmpty().withMessage('Note content cannot be empty'),

    check('folder').optional().isMongoId().withMessage('Invalid folder ID'),

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
  ],
};
