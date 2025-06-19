import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import Organization, { OrgRole } from '../models/Organization';
import mongoose from 'mongoose';

// Extend the Express Request type to include org property
declare global {
  namespace Express {
    interface Request {
      org?: any;
      orgRole?: OrgRole;
    }
  }
}

/**
 * Middleware to extract organization ID from request and verify user access
 *
 * Organization ID can be provided in 3 ways:
 * 1. req.headers['x-organization-id'] - Header (preferred for API clients)
 * 2. req.query.orgId - Query parameter
 * 3. req.params.orgId - Route parameter
 */
export const extractOrg = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip this middleware if user is not authenticated
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Get organization ID from request (header, query, params)
    const orgId = req.headers['x-organization-id'] || req.query.orgId || req.params.orgId;

    // If no organization ID provided, proceed without org context
    if (!orgId) {
      return next();
    }

    // Validate org ID format
    if (!mongoose.Types.ObjectId.isValid(orgId as string)) {
      return next(new AppError('Invalid organization ID format', 400));
    }

    // Find organization and check if user is a member
    const organization = await Organization.findById(orgId);

    if (!organization) {
      return next(new AppError('Organization not found', 404));
    }

    // Check if user is a member of the organization
    if (!organization.isUserMember(req.user._id.toString())) {
      return next(new AppError('You do not have access to this organization', 403));
    }

    // Get user's role in the organization
    const userRole = organization.getUserRole(req.user._id.toString());

    // Attach organization and role to request object for downstream handlers
    req.org = organization;
    req.orgRole = userRole as OrgRole;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to ensure the user has the required role(s) in the organization
 *
 * @param roles - Array of roles that are allowed to access the route
 */
export const requireOrgRole = (roles: OrgRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // If no org context or role, deny access
    if (!req.org || !req.orgRole) {
      return next(new AppError('Organization context required', 400));
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.orgRole)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

/**
 * Middleware to ensure organization context exists
 * Use this middleware for routes that must have organization context
 */
export const requireOrg = (req: Request, res: Response, next: NextFunction) => {
  if (!req.org) {
    return next(new AppError('Organization ID is required', 400));
  }

  next();
};
