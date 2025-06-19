import mongoose, { Document, Schema } from 'mongoose';

// Define status enum values
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  REVIEW = 'review',
  DONE = 'done',
  ARCHIVED = 'archived'
}

// Define priority enum values
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface ITask extends Document {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  assignedTo: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  orderIndex: number;
  tags?: string[];
  organization?: mongoose.Types.ObjectId; // Placeholder for future org module
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.TODO,
      required: [true, 'Task status is required'],
      index: true, // Index to optimize queries filtering by status
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
      required: [true, 'Task priority is required'],
    },
    dueDate: {
      type: Date,
      default: null,
      index: true, // Index to optimize queries filtering by due date
    },
    assignedTo: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      index: true, // Index to optimize queries filtering by assigned user
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
      index: true, // Index to optimize queries filtering by creator
    },
    orderIndex: {
      type: Number,
      required: [true, 'Order index is required for kanban ordering'],
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags: string[]) {
          // Ensure no duplicate tags
          return new Set(tags).size === tags.length;
        },
        message: 'Tags must be unique',
      },
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization', // Reference to future Organization model
      default: null,
      index: true, // Index to optimize queries filtering by organization
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index on status + orderIndex for efficient kanban operations
taskSchema.index({ status: 1, orderIndex: 1 });

// Create compound index on createdBy + status for efficiently listing user's tasks by status
taskSchema.index({ createdBy: 1, status: 1 });

// Create compound index on organization + status for efficiently listing org's tasks by status
taskSchema.index({ organization: 1, status: 1 });

// Create compound index on dueDate + status for efficiently listing tasks by due date
taskSchema.index({ dueDate: 1, status: 1 });

// Pre-save middleware to trim tags
taskSchema.pre<ITask>('save', function (next) {
  if (this.tags && this.tags.length > 0) {
    // Trim each tag and convert to lowercase for consistency
    this.tags = this.tags.map((tag) => tag.trim().toLowerCase());
  }
  next();
});

// Create Mongoose model
const Task = mongoose.model<ITask>('Task', taskSchema);

export default Task;
