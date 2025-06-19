import { AppError } from '../utils/AppError';
import TimeLog, { ITimeLog } from '../models/TimeLog';
import Task from '../models/Task';
import mongoose from 'mongoose';

interface TimeLogInput {
  task?: string;
  startTime?: Date;
  endTime?: Date;
  note?: string;
  tags?: string[];
  organization?: string;
}

export class TimeLogService {
  /**
   * Start a new timer for a user
   * @param userId - The ID of the user starting the timer
   * @param timeLogInput - Optional input data for the time log
   * @returns The newly created time log
   */
  static async startTimer(userId: string, timeLogInput: TimeLogInput): Promise<ITimeLog> {
    // Check if user already has an active timer
    const activeTimer = await TimeLog.findOne({ user: userId, isActive: true });

    if (activeTimer) {
      // Automatically stop the active timer before starting a new one
      await this.stopTimer(userId);
    }

    // Validate task if provided
    if (timeLogInput.task) {
      const task = await Task.findById(timeLogInput.task);
      if (!task) {
        throw new AppError('Task not found', 404);
      }

      // If task belongs to an organization, ensure the time log has the same organization
      if (task.organization) {
        timeLogInput.organization = task.organization.toString();
      }
    }

    // Create new time log with start time
    const timeLog = await TimeLog.create({
      user: userId,
      task: timeLogInput.task || null,
      organization: timeLogInput.organization || null,
      startTime: timeLogInput.startTime || new Date(),
      endTime: null,
      duration: null,
      note: timeLogInput.note || '',
      tags: timeLogInput.tags || [],
      isActive: true,
    });

    return timeLog;
  }

  /**
   * Stop the active timer for a user
   * @param userId - The ID of the user stopping their timer
   * @param updates - Optional updates to apply when stopping the timer
   * @returns The updated time log
   */
  static async stopTimer(userId: string, updates?: Partial<TimeLogInput>): Promise<ITimeLog | null> {
    const activeTimer = await TimeLog.findOne({ user: userId, isActive: true });

    if (!activeTimer) {
      throw new AppError('No active timer found', 404);
    }

    // Calculate duration in seconds
    const endTime = updates?.endTime || new Date();
    const duration = Math.round((endTime.getTime() - activeTimer.startTime.getTime()) / 1000);

    // Apply updates
    activeTimer.endTime = endTime;
    activeTimer.duration = duration;
    activeTimer.isActive = false;

    if (updates?.note) {
      activeTimer.note = updates.note;
    }

    if (updates?.tags) {
      activeTimer.tags = updates.tags;
    }

    // Save and return the updated time log
    await activeTimer.save();
    return activeTimer;
  }

  /**
   * Create a manual time log entry
   * @param userId - The ID of the user creating the entry
   * @param timeLogInput - Input data for the time log
   * @returns The created time log
   */
  static async createManualEntry(userId: string, timeLogInput: TimeLogInput): Promise<ITimeLog> {
    // Both start and end times must be provided for manual entries
    if (!timeLogInput.startTime || !timeLogInput.endTime) {
      throw new AppError('Start and end times are required for manual entries', 400);
    }

    // Validate that end time is after start time
    if (timeLogInput.endTime <= timeLogInput.startTime) {
      throw new AppError('End time must be after start time', 400);
    }

    // Calculate duration
    const duration = Math.round(
      (timeLogInput.endTime.getTime() - timeLogInput.startTime.getTime()) / 1000
    );

    // Validate task if provided
    if (timeLogInput.task) {
      const task = await Task.findById(timeLogInput.task);
      if (!task) {
        throw new AppError('Task not found', 404);
      }

      // If task belongs to an organization, ensure the time log has the same organization
      if (task.organization) {
        timeLogInput.organization = task.organization.toString();
      }
    }

    // Create the time log
    const timeLog = await TimeLog.create({
      user: userId,
      task: timeLogInput.task || null,
      organization: timeLogInput.organization || null,
      startTime: timeLogInput.startTime,
      endTime: timeLogInput.endTime,
      duration,
      note: timeLogInput.note || '',
      tags: timeLogInput.tags || [],
      isActive: false, // Manual entries are always completed (not active)
    });

    return timeLog;
  }

  /**
   * Get the active timer for a user
   * @param userId - The ID of the user
   * @returns The active time log or null if none exists
   */
  static async getActiveTimer(userId: string): Promise<ITimeLog | null> {
    return TimeLog.findOne({ user: userId, isActive: true })
      .populate('task')
      .populate('organization');
  }

  /**
   * Get time logs for a user with filtering and pagination
   * @param userId - The ID of the user
   * @param options - Query options
   * @returns Time logs and pagination info
   */
  static async getTimeLogs(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      taskId?: string;
      tag?: string;
      organization?: string;
      includeInactive?: boolean;
    } = {}
  ): Promise<{
    timeLogs: ITimeLog[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      taskId,
      tag,
      organization,
      includeInactive = true,
    } = options;

    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { user: userId };

    // Filter by active status if needed
    if (!includeInactive) {
      filter.isActive = true;
    }

    // Add date range filter
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) {
        filter.startTime.$gte = startDate;
      }
      if (endDate) {
        filter.startTime.$lte = endDate;
      }
    }

    // Add task filter
    if (taskId) {
      filter.task = taskId;
    }

    // Add tag filter
    if (tag) {
      filter.tags = tag;
    }

    // Add organization filter
    if (organization) {
      filter.organization = organization;
    }

    // Count total documents
    const totalCount = await TimeLog.countDocuments(filter);

    // Execute query
    const timeLogs = await TimeLog.find(filter)
      .populate('task')
      .populate('organization')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit);

    return {
      timeLogs,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  }

  /**
   * Get time logs for a specific task
   * @param taskId - The ID of the task
   * @param userId - The ID of the user (for permission checking)
   * @param orgId - Optional organization ID for org-scoped tasks
   * @returns Array of time logs for the task
   */
  static async getTimeLogsByTask(
    taskId: string,
    userId: string,
    orgId?: string
  ): Promise<ITimeLog[]> {
    // Verify task exists and user has access
    const taskFilter: any = { _id: taskId };
    
    if (orgId) {
      taskFilter.$or = [
        { createdBy: userId },
        { organization: orgId }
      ];
    } else {
      taskFilter.createdBy = userId;
    }
    
    const task = await Task.findOne(taskFilter);
    if (!task) {
      throw new AppError('Task not found or access denied', 404);
    }

    // Get time logs for the task
    return TimeLog.find({ task: taskId })
      .sort({ startTime: -1 })
      .populate('task')
      .populate('organization');
  }

  /**
   * Update a time log
   * @param logId - The ID of the time log to update
   * @param userId - The ID of the user (for permission checking)
   * @param updates - The updates to apply
   * @param orgId - Optional organization ID for org scoped time logs
   * @returns The updated time log
   */
  static async updateTimeLog(
    logId: string,
    userId: string,
    updates: Partial<TimeLogInput>,
    orgId?: string
  ): Promise<ITimeLog> {
    // Build filter to ensure user owns the time log or it's in their org
    const filter: any = { _id: logId };
    
    if (orgId) {
      filter.$or = [
        { user: userId },
        { organization: orgId }
      ];
    } else {
      filter.user = userId;
    }
    
    const timeLog = await TimeLog.findOne(filter);
    if (!timeLog) {
      throw new AppError('Time log not found or access denied', 404);
    }

    // Check if updating task
    if (updates.task) {
      const task = await Task.findById(updates.task);
      if (!task) {
        throw new AppError('Task not found', 404);
      }

      // If task has an organization, ensure it matches
      if (task.organization && timeLog.organization && 
          task.organization.toString() !== timeLog.organization.toString()) {
        throw new AppError('Task must belong to the same organization as the time log', 400);
      }
    }

    // If updating start/end times, recalculate duration
    if ((updates.startTime && timeLog.endTime) || 
        (updates.endTime && timeLog.startTime) || 
        (updates.startTime && updates.endTime)) {
      
      const start = updates.startTime || timeLog.startTime;
      const end = updates.endTime || timeLog.endTime;
      
      // Make sure end time exists and is after start time
      if (end && end <= start) {
        throw new AppError('End time must be after start time', 400);
      }
      
      if (end) {
        // We need to update the timeLog directly since duration isn't in TimeLogInput type
        timeLog.duration = Math.round((end.getTime() - start.getTime()) / 1000);
      }
    }

    // Apply updates
    Object.assign(timeLog, updates);
    await timeLog.save();
    
    return timeLog;
  }

  /**
   * Delete a time log
   * @param logId - The ID of the time log to delete
   * @param userId - The ID of the user (for permission checking)
   * @param orgId - Optional organization ID for org-scoped time logs
   */
  static async deleteTimeLog(logId: string, userId: string, orgId?: string): Promise<void> {
    // Build filter to ensure user owns the time log or it's in their org
    const filter: any = { _id: logId };
    
    if (orgId) {
      filter.$or = [
        { user: userId },
        { organization: orgId }
      ];
    } else {
      filter.user = userId;
    }
    
    const result = await TimeLog.deleteOne(filter);
    
    if (result.deletedCount === 0) {
      throw new AppError('Time log not found or access denied', 404);
    }
  }

  /**
   * Clean up stale active timers (for admin use or automated cleanup)
   * @param cutoffHours - Number of hours after which an active timer is considered stale
   * @returns Number of timers auto-stopped
   */
  static async cleanupStaleTimers(cutoffHours: number = 24): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - cutoffHours);

    const staleTimers = await TimeLog.find({
      isActive: true,
      startTime: { $lt: cutoffDate },
    });

    let count = 0;
    for (const timer of staleTimers) {
      // Calculate duration and close the timer
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - timer.startTime.getTime()) / 1000);
      
      timer.endTime = endTime;
      timer.duration = duration;
      timer.isActive = false;
      timer.note = timer.note ? 
        `${timer.note} [Auto-stopped due to inactivity]` : 
        '[Auto-stopped due to inactivity]';
      
      await timer.save();
      count++;
    }

    return count;
  }
  
  /**
   * Get time summary statistics
   * @param userId - The ID of the user
   * @param options - Query options
   * @returns Time statistics
   */
  static async getTimeStatistics(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      organization?: string;
    } = {}
  ): Promise<{
    totalDuration: number;
    taskBreakdown: { taskId: string; taskName: string; duration: number }[];
    dailyTotals: { date: string; duration: number }[];
  }> {
    const { startDate, endDate, organization } = options;

    // Build match stage for aggregation
    const match: any = {
      user: new mongoose.Types.ObjectId(userId),
      isActive: false, // Only include completed logs
    };

    // Add date filters if provided
    if (startDate || endDate) {
      match.startTime = {};
      if (startDate) match.startTime.$gte = startDate;
      if (endDate) match.startTime.$lte = endDate;
    }

    // Add organization filter if provided
    if (organization) {
      match.organization = new mongoose.Types.ObjectId(organization);
    }

    // Aggregation pipeline for total duration
    const totalResult = await TimeLog.aggregate([
      { $match: match },
      { $group: { _id: null, totalDuration: { $sum: '$duration' } } },
    ]);

    // Aggregation pipeline for task breakdown
    const taskBreakdown = await TimeLog.aggregate([
      { $match: match },
      { $lookup: { from: 'tasks', localField: 'task', foreignField: '_id', as: 'taskDetails' } },
      { $unwind: { path: '$taskDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$task',
          taskName: { $first: { $ifNull: ['$taskDetails.title', 'Unassigned'] } },
          duration: { $sum: '$duration' },
        },
      },
      { $project: { _id: 0, taskId: '$_id', taskName: 1, duration: 1 } },
      { $sort: { duration: -1 } },
    ]);

    // Aggregation pipeline for daily totals
    const dailyTotals = await TimeLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
          duration: { $sum: '$duration' },
        },
      },
      { $project: { _id: 0, date: '$_id', duration: 1 } },
      { $sort: { date: 1 } },
    ]);

    return {
      totalDuration: totalResult.length > 0 ? totalResult[0].totalDuration : 0,
      taskBreakdown,
      dailyTotals,
    };
  }
}
