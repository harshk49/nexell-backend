import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
  name: string;
  user: mongoose.Types.ObjectId;
  organization?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolder>(
  {
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
      maxlength: [50, 'Folder name cannot be more than 50 characters'],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true, // Index to optimize queries by user
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true, // Index to optimize queries by organization
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index on user + name + organization for enforcing uniqueness
// This ensures folder names are unique per user within personal context or org context
folderSchema.index(
  {
    user: 1,
    name: 1,
    organization: 1,
  },
  {
    unique: true,
  }
);

// Create compound index on organization + name for faster org-based lookups
folderSchema.index({ organization: 1, name: 1 });

// Create Mongoose model
const Folder = mongoose.model<IFolder>('Folder', folderSchema);

export default Folder;
