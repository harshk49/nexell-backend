import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { FolderService } from '../services/folderService';
import { AppError } from '../utils/AppError';

export const createFolder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation error', 400);
    }

    // Add organization from request context if available
    if (req.org) {
      req.body.organization = req.org._id;
    }

    const folder = await FolderService.createFolder(req.user!._id.toString(), req.body);

    res.status(201).json({
      status: 'success',
      data: { folder },
    });
  } catch (error) {
    next(error);
  }
};

export const getFolders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.org ? req.org._id.toString() : undefined;
    const folders = await FolderService.getFolders(req.user!._id.toString(), orgId);

    res.status(200).json({
      status: 'success',
      data: { folders },
    });
  } catch (error) {
    next(error);
  }
};

export const getFolderById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.org ? req.org._id.toString() : undefined;
    const folder = await FolderService.getFolderById(
      req.params.id,
      req.user!._id.toString(),
      orgId
    );

    res.status(200).json({
      status: 'success',
      data: { folder },
    });
  } catch (error) {
    next(error);
  }
};

export const updateFolder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation error', 400);
    }

    const orgId = req.org ? req.org._id.toString() : undefined;
    const folder = await FolderService.updateFolder(
      req.params.id,
      req.user!._id.toString(),
      req.body,
      orgId
    );

    res.status(200).json({
      status: 'success',
      data: { folder },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFolder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { targetFolderId } = req.body;
    const orgId = req.org ? req.org._id.toString() : undefined;

    await FolderService.deleteFolder(
      req.params.id,
      req.user!._id.toString(),
      targetFolderId,
      orgId
    );

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
