import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/**
 * This middleware ensures that resources belong to the same organization as the user.
 * This is a placeholder until the complete organization module is implemented.
 *
 * How to use:
 * 1. The middleware should be placed after the protect middleware in the route chain
 * 2. It can be used for specific routes that need organization context validation
 *
 * @param modelName The name of the model to check for organization context
 */
export const checkOrgContext = (modelName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip if we're creating a new resource (POST)
      if (req.method === 'POST' && !req.params.id) {
        return next();
      }

      // Get the model based on modelName
      // Note: This will need to be updated when Organization model is implemented
      const Model = require(`../models/${modelName}`).default;

      if (!Model) {
        throw new AppError(`Model ${modelName} not found`, 500);
      }

      // Skip if there's no ID parameter (e.g., for listing resources)
      if (!req.params.id) {
        return next();
      }

      // Fetch the resource
      const resource = await Model.findById(req.params.id);

      if (!resource) {
        throw new AppError('Resource not found', 404);
      }

      // Check organization context when the organization model and relations are implemented
      // For now, just check that the user has direct relation to the resource

      // For Task model, check if user is creator or assignee
      if (modelName === 'Task') {
        const isCreator = resource.createdBy.toString() === req.user!._id.toString();
        const isAssigned =
          resource.assignedTo &&
          resource.assignedTo.some((id: any) => id.toString() === req.user!._id.toString());

        if (!isCreator && !isAssigned) {
          throw new AppError('You do not have access to this resource', 403);
        }
      }
      // For other models, can add similar context checks here

      // If all checks pass, continue
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Future implementation notes:
 *
 * When the Organization model is implemented:
 * 1. Check if the user belongs to the organization specified in the resource
 * 2. Check if the user has appropriate permissions within that organization
 * 3. Consider role-based checks (admin, member, etc.)
 *
 * Example:
 *
 * const userOrgs = await OrganizationMember.find({ user: req.user._id });
 * const userOrgIds = userOrgs.map(org => org.organization.toString());
 *
 * if (resource.organization && !userOrgIds.includes(resource.organization.toString())) {
 *   throw new AppError('You do not have access to this resource', 403);
 * }
 */
