import { check } from 'express-validator';
import { OrgRole } from '../models/Organization';

export const organizationValidationRules = {
  create: [
    check('name')
      .trim()
      .notEmpty()
      .withMessage('Organization name is required')
      .isLength({ max: 100 })
      .withMessage('Name cannot be more than 100 characters')
      .escape(),

    check('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot be more than 500 characters')
      .escape(),
  ],

  update: [
    check('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Organization name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Name cannot be more than 100 characters')
      .escape(),

    check('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot be more than 500 characters')
      .escape(),
  ],

  joinWithInviteCode: [
    check('inviteCode')
      .trim()
      .notEmpty()
      .withMessage('Invite code is required')
      .isLength({ min: 8, max: 8 })
      .withMessage('Invalid invite code format')
      .isAlphanumeric()
      .withMessage('Invite code must contain only letters and numbers'),
  ],

  updateMemberRole: [
    check('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isMongoId()
      .withMessage('Invalid user ID'),

    check('role')
      .notEmpty()
      .withMessage('Role is required')
      .isIn(Object.values(OrgRole))
      .withMessage(`Role must be one of: ${Object.values(OrgRole).join(', ')}`),
  ],

  getOrganizationById: [check('id').isMongoId().withMessage('Invalid organization ID')],
};
