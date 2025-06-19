import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { TaskService } from '../services/taskService';
import { AppError } from '../utils/AppError';
import { TaskStatus, TaskPriority } from '../models/Task';

export const createTask = async (
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

    const task = await TaskService.createTask(req.user!._id.toString(), req.body);

    res.status(201).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(`Validation error: ${errors.array()[0].msg}`, 400);
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    // Get query parameters for filtering
    const {
      status,
      assignedTo,
      dueDateStart,
      dueDateEnd,
      tag,
      priority,
      organization,
      search,
      sortBy,
      sortDirection,
    } = req.query;

    // Process multi-value status input (comma-separated)
    let processedStatus: TaskStatus | TaskStatus[] | undefined = undefined;
    if (status) {
      if ((status as string).includes(',')) {
        processedStatus = (status as string).split(',') as TaskStatus[];
      } else {
        processedStatus = status as TaskStatus;
      }
    }

    // Process multi-value priority input (comma-separated)
    let processedPriority: TaskPriority | TaskPriority[] | undefined = undefined;
    if (priority) {
      if ((priority as string).includes(',')) {
        processedPriority = (priority as string).split(',') as TaskPriority[];
      } else {
        processedPriority = priority as TaskPriority;
      }
    }

    // Type assertion for sortDirection
    const direction = sortDirection as 'asc' | 'desc' | undefined;

    const result = await TaskService.getTasks(req.user!._id.toString(), {
      page,
      limit,
      status: processedStatus,
      assignedTo: assignedTo as string,
      dueDateStart: dueDateStart as unknown as Date,
      dueDateEnd: dueDateEnd as unknown as Date,
      tag: tag as string,
      priority: processedPriority,
      organization: organization as string,
      search: search as string,
      sortBy: sortBy as string,
      sortDirection: direction,
    });

    res.status(200).json({
      status: 'success',
      data: {
        tasks: result.tasks,
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

export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await TaskService.getTaskById(req.params.id, req.user!._id.toString());

    res.status(200).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
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

    const task = await TaskService.updateTask(req.params.id, req.user!._id.toString(), req.body);

    res.status(200).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaskOrder = async (
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

    const { status, orderIndex } = req.body;

    const task = await TaskService.updateTaskOrder(
      req.params.id,
      req.user!._id.toString(),
      status,
      orderIndex
    );

    res.status(200).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const rebalanceTaskOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = req.query.status as TaskStatus | undefined;

    await TaskService.rebalanceTaskOrder(req.user!._id.toString(), status);

    res.status(200).json({
      status: 'success',
      message: 'Task order has been rebalanced',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await TaskService.deleteTask(req.params.id, req.user!._id.toString());

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
