import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import Task, { ITask, TaskStatus, TaskPriority } from '../models/Task';
import User from '../models/User';

interface TaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  assignedTo?: string[];
  tags?: string[];
  organization?: string; // Organization ID
}

interface TasksQueryOptions {
  page?: number;
  limit?: number;
  status?: TaskStatus | TaskStatus[];
  assignedTo?: string;
  dueDateStart?: Date;
  dueDateEnd?: Date;
  tag?: string;
  priority?: TaskPriority | TaskPriority[];
  organization?: string;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export class TaskService {
  /**
   * Create a new task
   */
  static async createTask(userId: string, taskInput: TaskInput): Promise<ITask> {
    const { assignedTo, organization, ...rest } = taskInput;

    // Validate assignedUsers exist in database
    if (assignedTo && assignedTo.length > 0) {
      const users = await User.find({ _id: { $in: assignedTo } });

      // Check if all provided users exist
      if (users.length !== assignedTo.length) {
        throw new AppError('One or more assigned users do not exist', 400);
      }
    }

    // Determine the highest orderIndex for tasks with this status
    const maxOrderTask = await Task.findOne({
      status: rest.status || TaskStatus.TODO,
      createdBy: userId,
    })
      .sort({ orderIndex: -1 })
      .select('orderIndex');

    const orderIndex = maxOrderTask ? maxOrderTask.orderIndex + 1000 : 1000;

    // Create task
    const task = await Task.create({
      ...rest,
      assignedTo: assignedTo || [],
      createdBy: userId,
      organization: organization || null,
      orderIndex: orderIndex,
    });

    return task;
  }

  /**
   * Get a task by ID, ensuring it belongs to the given user or organization
   */
  static async getTaskById(taskId: string, userId: string): Promise<ITask> {
    const task = await Task.findOne({
      _id: taskId,
      $or: [{ createdBy: userId }, { assignedTo: userId }],
    }).populate('assignedTo', 'name email');

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    return task;
  }

  /**
   * Update a task, ensuring it belongs to the given user
   */
  static async updateTask(
    taskId: string,
    userId: string,
    updates: Partial<TaskInput>
  ): Promise<ITask> {
    const { assignedTo, ...restUpdates } = updates;

    // Validate assignedUsers exist in database
    if (assignedTo && assignedTo.length > 0) {
      const users = await User.find({ _id: { $in: assignedTo } });

      // Check if all provided users exist
      if (users.length !== assignedTo.length) {
        throw new AppError('One or more assigned users do not exist', 400);
      }
    }

    // Find and update task
    const updatedTask = await Task.findOneAndUpdate(
      {
        _id: taskId,
        createdBy: userId,
      },
      {
        ...restUpdates,
        assignedTo: assignedTo || undefined,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate('assignedTo', 'name email');

    if (!updatedTask) {
      throw new AppError('Task not found or you do not have permission to update it', 404);
    }

    return updatedTask;
  }

  /**
   * Delete a task, ensuring it belongs to the given user
   */
  static async deleteTask(taskId: string, userId: string): Promise<void> {
    const result = await Task.deleteOne({
      _id: taskId,
      createdBy: userId,
    });

    if (result.deletedCount === 0) {
      throw new AppError('Task not found or you do not have permission to delete it', 404);
    }
  }

  /**
   * Update task order index
   */
  static async updateTaskOrder(
    taskId: string,
    userId: string,
    newStatus: TaskStatus,
    newOrderIndex: number
  ): Promise<ITask> {
    // Validate that the task exists and belongs to the user
    const task = await Task.findOne({ _id: taskId, createdBy: userId });

    if (!task) {
      throw new AppError('Task not found or you do not have permission to update it', 404);
    }

    const oldStatus = task.status;
    const oldOrderIndex = task.orderIndex;

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // If status changed, update order indices for affected tasks in both statuses
      if (oldStatus !== newStatus) {
        // Move other tasks in target status down to make room
        await Task.updateMany(
          {
            createdBy: userId,
            status: newStatus,
            orderIndex: { $gte: newOrderIndex },
          },
          { $inc: { orderIndex: 1000 } }, // Increment by 1000 to make space
          { session }
        );

        // Close gap in source status
        await Task.updateMany(
          {
            createdBy: userId,
            status: oldStatus,
            orderIndex: { $gt: oldOrderIndex },
          },
          { $inc: { orderIndex: -1000 } }, // Decrement by 1000 to close gap
          { session }
        );
      } else {
        // Same status, just reordering
        if (newOrderIndex < oldOrderIndex) {
          // Moving up: increment all tasks between new and old positions
          await Task.updateMany(
            {
              createdBy: userId,
              status: newStatus,
              orderIndex: { $gte: newOrderIndex, $lt: oldOrderIndex },
            },
            { $inc: { orderIndex: 1000 } },
            { session }
          );
        } else if (newOrderIndex > oldOrderIndex) {
          // Moving down: decrement all tasks between old and new positions
          await Task.updateMany(
            {
              createdBy: userId,
              status: newStatus,
              orderIndex: { $gt: oldOrderIndex, $lte: newOrderIndex },
            },
            { $inc: { orderIndex: -1000 } },
            { session }
          );
        }
      }

      // Update the task itself
      const updatedTask = await Task.findByIdAndUpdate(
        taskId,
        { status: newStatus, orderIndex: newOrderIndex },
        { new: true, session, runValidators: true }
      ).populate('assignedTo', 'name email');

      // Commit the transaction
      await session.commitTransaction();

      return updatedTask!;
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Rebalance order indices to ensure even spacing
   * This should be called periodically or when gaps get too small
   */
  static async rebalanceTaskOrder(userId: string, status?: TaskStatus): Promise<void> {
    const SPACING = 1000; // Standard spacing between tasks

    // Create filter based on parameters
    const filter: any = { createdBy: userId };
    if (status) {
      filter.status = status;
    }

    // Group by status for processing
    const statuses = status ? [status] : await Task.distinct('status', { createdBy: userId });

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (const statusValue of statuses) {
        // Get all tasks for this status, sorted by current order
        const tasks = await Task.find({
          ...filter,
          status: statusValue,
        })
          .sort({ orderIndex: 1 })
          .select('_id')
          .session(session);

        // Rebalance order indices with even spacing
        for (let i = 0; i < tasks.length; i++) {
          await Task.findByIdAndUpdate(
            tasks[i]._id,
            { orderIndex: (i + 1) * SPACING },
            { session }
          );
        }
      }

      // Commit the transaction
      await session.commitTransaction();
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Query tasks with filters, pagination and sorting
   */
  static async getTasks(
    userId: string,
    options: TasksQueryOptions = {}
  ): Promise<{
    tasks: ITask[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const {
      page = 1,
      limit = 20,
      status,
      assignedTo,
      dueDateStart,
      dueDateEnd,
      tag,
      priority,
      organization,
      search,
      sortBy = 'orderIndex',
      sortDirection = 'asc',
    } = options;

    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {
      $or: [{ createdBy: userId }, { assignedTo: userId }],
    };

    // Add status filter if specified
    if (status) {
      filter.status = Array.isArray(status) ? { $in: status } : status;
    }

    // Add assignedTo filter if specified
    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    // Add due date range filter if specified
    if (dueDateStart || dueDateEnd) {
      filter.dueDate = {};

      if (dueDateStart) {
        filter.dueDate.$gte = dueDateStart;
      }

      if (dueDateEnd) {
        filter.dueDate.$lte = dueDateEnd;
      }
    }

    // Add tag filter if specified
    if (tag) {
      filter.tags = tag;
    }

    // Add priority filter if specified
    if (priority) {
      filter.priority = Array.isArray(priority) ? { $in: priority } : priority;
    }

    // Add organization filter if specified
    if (organization) {
      filter.organization = organization;
    }

    // Add search filter if specified
    if (search) {
      const searchRegex = new RegExp(search, 'i'); // case-insensitive search
      filter.$and = [
        filter.$or ? { $or: filter.$or } : {},
        {
          $or: [{ title: searchRegex }, { description: searchRegex }],
        },
      ];
      delete filter.$or;
    }

    // Count total matching documents
    const totalCount = await Task.countDocuments(filter);

    // Build sort object
    const sort: Record<string, any> = {};

    // If sorting by dueDate, handle null values
    if (sortBy === 'dueDate') {
      // Handle null dueDate values - sort null values last regardless of direction
      if (sortDirection === 'asc') {
        // For ascending, use a custom sort function that puts nulls at the end
        sort.dueDate = 1;
      } else {
        // For descending, use a custom sort function that puts nulls at the end
        sort.dueDate = -1;
      }
    } else {
      // For other fields, use regular sorting
      sort[sortBy] = sortDirection === 'asc' ? 1 : -1;
    }

    // Add secondary sort by orderIndex and createdAt to ensure consistent ordering
    if (sortBy !== 'orderIndex') sort.orderIndex = 1;
    if (sortBy !== 'createdAt') sort.createdAt = -1;

    // Execute query with pagination and sorting
    const tasks = (await Task.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'name email')
      .lean()) as unknown as ITask[];

    return {
      tasks,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  }
}
