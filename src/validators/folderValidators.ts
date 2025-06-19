import { check } from 'express-validator';

export const folderValidationRules = {
  create: [
    check('name')
      .trim()
      .notEmpty()
      .withMessage('Folder name is required')
      .isLength({ max: 50 })
      .withMessage('Folder name cannot be more than 50 characters')
      .escape(),
  ],

  update: [
    check('name')
      .trim()
      .notEmpty()
      .withMessage('Folder name is required')
      .isLength({ max: 50 })
      .withMessage('Folder name cannot be more than 50 characters')
      .escape(),
  ],

  delete: [check('targetFolderId').optional().isMongoId().withMessage('Invalid target folder ID')],
};
