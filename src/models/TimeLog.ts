import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeLog extends Document {
  task?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  organization?: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  note?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const timeLogSchema = new Schema<ITimeLog>(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
      index: true, // Index for efficiently finding logs associated with a task
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true, // Index for efficiently finding logs by user
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true, // Index for efficiently finding logs by organization
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true, // Index for time-range queries and sorting
    },
    endTime: {
      type: Date,
      default: null, // Null indicates an active timer
    },
    duration: {
      type: Number,
      default: null, // Duration in seconds, calculated when timer stops
    },
    note: {
      type: String,
      trim: true,
      maxlength: [1000, 'Note cannot be more than 1000 characters'],
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
    isActive: {
      type: Boolean,
      default: true,
      index: true, // Index for efficiently finding active timers
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on user + isActive for quickly finding a user's active timer
timeLogSchema.index({ user: 1, isActive: 1 });

// Compound index on organization + user for org-based user activity reports
timeLogSchema.index({ organization: 1, user: 1 });

// Compound index on task + user for task-specific time tracking by user
timeLogSchema.index({ task: 1, user: 1 });

// Compound index on startTime + endTime for date range queries
timeLogSchema.index({ startTime: 1, endTime: 1 });

// Pre-save middleware to trim tags
timeLogSchema.pre<ITimeLog>('save', function (next) {
  if (this.tags && this.tags.length > 0) {
    // Trim each tag and convert to lowercase for consistency
    this.tags = this.tags.map((tag) => tag.trim().toLowerCase());
  }
  next();
});

// Create Mongoose model
const TimeLog = mongoose.model<ITimeLog>('TimeLog', timeLogSchema);

export default TimeLog;
