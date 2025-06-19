import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { TimeLogService } from '../services/timeLogService';
import { AppError } from '../utils/AppError';

export const startTimer = async (
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
    
    const timeLog = await TimeLogService.startTimer(req.user!._id.toString(), req.body);

    res.status(201).json({
      status: 'success',
      data: { timeLog },
    });
  } catch (error) {
    next(error);
  }
};

export const stopTimer = async (
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

    const timeLog = await TimeLogService.stopTimer(req.user!._id.toString(), req.body);

    res.status(200).json({
      status: 'success',
      data: { timeLog },
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveTimer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const timeLog = await TimeLogService.getActiveTimer(req.user!._id.toString());

    res.status(200).json({
      status: 'success',
      data: { timeLog },
    });
  } catch (error) {
    next(error);
  }
};

export const createManualEntry = async (
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

    const timeLog = await TimeLogService.createManualEntry(req.user!._id.toString(), req.body);

    res.status(201).json({
      status: 'success',
      data: { timeLog },
    });
  } catch (error) {
    next(error);
  }
};

export const getTimeLogs = async (
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

    const { page, limit, startDate, endDate, taskId, tag } = req.query;
    const orgId = req.org ? req.org._id.toString() : undefined;
    
    const result = await TimeLogService.getTimeLogs(req.user!._id.toString(), {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      taskId: taskId as string,
      tag: tag as string,
      organization: orgId,
    });

    res.status(200).json({
      status: 'success',
      data: {
        timeLogs: result.timeLogs,
        pagination: {
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.currentPage,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTimeLogsByTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.org ? req.org._id.toString() : undefined;
    const timeLogs = await TimeLogService.getTimeLogsByTask(
      req.params.taskId,
      req.user!._id.toString(),
      orgId
    );

    res.status(200).json({
      status: 'success',
      data: { timeLogs },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTimeLog = async (
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
    const timeLog = await TimeLogService.updateTimeLog(
      req.params.id,
      req.user!._id.toString(),
      req.body,
      orgId
    );

    res.status(200).json({
      status: 'success',
      data: { timeLog },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTimeLog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.org ? req.org._id.toString() : undefined;
    await TimeLogService.deleteTimeLog(
      req.params.id,
      req.user!._id.toString(),
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

export const getTimeStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const orgId = req.org ? req.org._id.toString() : undefined;
    
    const statistics = await TimeLogService.getTimeStatistics(req.user!._id.toString(), {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      organization: orgId,
    });

    res.status(200).json({
      status: 'success',
      data: { statistics },
    });
  } catch (error) {
    next(error);
  }
};
