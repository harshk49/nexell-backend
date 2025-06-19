import mongoose, { Document, Schema } from 'mongoose';

export interface INote extends Document {
  title: string;
  content: string;
  user: mongoose.Types.ObjectId;
  folder?: mongoose.Types.ObjectId | null;
  organization?: mongoose.Types.ObjectId | null;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true, // Index to optimize queries by user
    },
    folder: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true, // Index to optimize queries by organization
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
  },
  {
    timestamps: true,
  }
);

// Create compound index on user + title for faster lookups
noteSchema.index({ user: 1, title: 1 });

// Create compound index on user + createdAt for listing with sorting
noteSchema.index({ user: 1, createdAt: -1 });

// Create compound index on organization + createdAt for organization-based sorting
noteSchema.index({ organization: 1, createdAt: -1 });

// Create compound index on organization + user for faster lookups
noteSchema.index({ organization: 1, user: 1 });

// No text index - removed text search functionality

// Pre-save middleware to trim tags
noteSchema.pre<INote>('save', function (next) {
  if (this.tags && this.tags.length > 0) {
    // Trim each tag and convert to lowercase for consistency
    this.tags = this.tags.map((tag) => tag.trim().toLowerCase());
  }
  next();
});

// Create Mongoose model
const Note = mongoose.model<INote>('Note', noteSchema);

export default Note;
