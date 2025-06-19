import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
  name: string;
  user: mongoose.Types.ObjectId;
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
  },
  {
    timestamps: true,
  }
);

// Create compound index on user + name for faster lookups
// Also enforce uniqueness of folder names per user
folderSchema.index({ user: 1, name: 1 }, { unique: true });

// Create Mongoose model
const Folder = mongoose.model<IFolder>('Folder', folderSchema);

export default Folder;
