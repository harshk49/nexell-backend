import { Router } from 'express';
import * as organizationController from '../controllers/organizationController';
import { protect } from '../middleware';
import { extractOrg, requireOrgRole } from '../middleware/orgMiddleware';
import { organizationValidationRules } from '../validators/organizationValidators';
import { OrgRole } from '../models/Organization';

const router = Router();

// All routes require authentication
router.use(protect);

// Routes that don't require organization context
router.post('/', organizationValidationRules.create, organizationController.createOrganization);
router.get('/', organizationController.getUserOrganizations);
router.post(
  '/join',
  organizationValidationRules.joinWithInviteCode,
  organizationController.joinWithInviteCode
);

// Organization-specific routes
router.get(
  '/:id',
  organizationValidationRules.getOrganizationById,
  organizationController.getOrganization
);
router.patch(
  '/:id',
  [extractOrg, ...organizationValidationRules.update],
  organizationController.updateOrganization
);
router.delete('/:id', extractOrg, organizationController.deleteOrganization);

// Invite code management
router.post('/:id/invite', extractOrg, organizationController.generateInviteCode);

// Member management
router.patch(
  '/:orgId/members',
  extractOrg,
  requireOrgRole([OrgRole.ADMIN]),
  organizationValidationRules.updateMemberRole,
  organizationController.updateMemberRole
);

router.delete('/:orgId/members/:userId', extractOrg, organizationController.removeMember);

export default router;
