import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { NoteService } from '../services/noteService';
import { AppError } from '../utils/AppError';

export const createNote = async (
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

    const note = await NoteService.createNote(req.user!._id.toString(), req.body);

    res.status(201).json({
      status: 'success',
      data: { note },
    });
  } catch (error) {
    next(error);
  }
};

export const getNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    // Get query parameters
    const { folder, tag, search, sortBy, sortDirection } = req.query;

    // Type assertion for sortDirection
    const direction = sortDirection as 'asc' | 'desc' | undefined;

    const result = await NoteService.getNotes(req.user!._id.toString(), {
      page,
      limit,
      folder: folder as string,
      tag: tag as string,
      search: search as string,
      sortBy: sortBy as string,
      sortDirection: direction,
      organization: req.org ? req.org._id.toString() : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: {
        notes: result.notes,
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

export const getNoteById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.org ? req.org._id.toString() : undefined;
    const note = await NoteService.getNoteById(req.params.id, req.user!._id.toString(), orgId);

    res.status(200).json({
      status: 'success',
      data: { note },
    });
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (
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
    const note = await NoteService.updateNote(
      req.params.id,
      req.user!._id.toString(),
      req.body,
      orgId
    );

    res.status(200).json({
      status: 'success',
      data: { note },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.org ? req.org._id.toString() : undefined;
    await NoteService.deleteNote(req.params.id, req.user!._id.toString(), orgId);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
