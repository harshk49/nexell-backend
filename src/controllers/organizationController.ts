import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { OrganizationService } from '../services/organizationService';
import { AppError } from '../utils/AppError';
import { OrgRole } from '../models/Organization';

export const createOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(`Validation error: ${errors.array()[0].msg}`, 400);
    }

    const organization = await OrganizationService.createOrganization(
      req.user!._id.toString(),
      req.body
    );

    res.status(201).json({
      status: 'success',
      data: { organization },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // If orgId is in params, use it, otherwise use the org from middleware
    const orgId = req.params.id || req.org?._id.toString();

    if (!orgId) {
      throw new AppError('Organization ID is required', 400);
    }

    const organization = await OrganizationService.getOrganizationById(
      orgId,
      req.user!._id.toString()
    );

    res.status(200).json({
      status: 'success',
      data: { organization },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserOrganizations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string;
    const sortDirection = req.query.sortDirection as 'asc' | 'desc' | undefined;

    const result = await OrganizationService.getUserOrganizations(req.user!._id.toString(), {
      page,
      limit,
      search,
      sortBy,
      sortDirection,
    });

    res.status(200).json({
      status: 'success',
      data: {
        organizations: result.organizations,
        pagination: {
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.currentPage,
          limit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(`Validation error: ${errors.array()[0].msg}`, 400);
    }

    const orgId = req.params.id || req.org?._id.toString();

    if (!orgId) {
      throw new AppError('Organization ID is required', 400);
    }

    const organization = await OrganizationService.updateOrganization(
      orgId,
      req.user!._id.toString(),
      req.body
    );

    res.status(200).json({
      status: 'success',
      data: { organization },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.params.id || req.org?._id.toString();

    if (!orgId) {
      throw new AppError('Organization ID is required', 400);
    }

    await OrganizationService.deleteOrganization(orgId, req.user!._id.toString());

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const generateInviteCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.params.id || req.org?._id.toString();

    if (!orgId) {
      throw new AppError('Organization ID is required', 400);
    }

    const result = await OrganizationService.generateInviteCode(orgId, req.user!._id.toString());

    res.status(200).json({
      status: 'success',
      data: {
        organization: result.organization,
        inviteCode: result.inviteCode,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const joinWithInviteCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(`Validation error: ${errors.array()[0].msg}`, 400);
    }

    const { inviteCode } = req.body;

    const organization = await OrganizationService.joinWithInviteCode(
      inviteCode,
      req.user!._id.toString()
    );

    res.status(200).json({
      status: 'success',
      data: { organization },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(`Validation error: ${errors.array()[0].msg}`, 400);
    }

    const orgId = req.params.orgId || req.org?._id.toString();
    const { userId, role } = req.body;

    if (!orgId) {
      throw new AppError('Organization ID is required', 400);
    }

    const organization = await OrganizationService.updateMemberRole(
      orgId,
      req.user!._id.toString(),
      userId,
      role as OrgRole
    );

    res.status(200).json({
      status: 'success',
      data: { organization },
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.params.orgId || req.org?._id.toString();
    const userId = req.params.userId || req.body.userId;

    if (!orgId) {
      throw new AppError('Organization ID is required', 400);
    }

    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    const organization = await OrganizationService.removeMember(
      orgId,
      req.user!._id.toString(),
      userId
    );

    res.status(200).json({
      status: 'success',
      data: { organization },
    });
  } catch (error) {
    next(error);
  }
};
