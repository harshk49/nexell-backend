import { AppError } from '../utils/AppError';
import Folder, { IFolder } from '../models/Folder';
import Note from '../models/Note';

interface FolderInput {
  name: string;
}

export class FolderService {
  /**
   * Create a new folder for a user
   */
  static async createFolder(userId: string, folderInput: FolderInput): Promise<IFolder> {
    try {
      const folder = await Folder.create({
        ...folderInput,
        user: userId,
      });
      return folder;
    } catch (error: any) {
      // Handle duplicate folder name error
      if (error.code === 11000) {
        throw new AppError('Folder with this name already exists', 400);
      }
      throw error;
    }
  }

  /**
   * Get all folders for a user
   */
  static async getFolders(userId: string): Promise<IFolder[]> {
    const folders = await Folder.find({ user: userId }).sort({ name: 1 });
    return folders;
  }

  /**
   * Get a folder by ID, ensuring it belongs to the given user
   */
  static async getFolderById(folderId: string, userId: string): Promise<IFolder> {
    const folder = await Folder.findOne({ _id: folderId, user: userId });
    if (!folder) {
      throw new AppError('Folder not found', 404);
    }
    return folder;
  }

  /**
   * Update a folder, ensuring it belongs to the given user
   */
  static async updateFolder(
    folderId: string,
    userId: string,
    updates: FolderInput
  ): Promise<IFolder> {
    try {
      const updatedFolder = await Folder.findOneAndUpdate(
        { _id: folderId, user: userId },
        updates,
        { new: true, runValidators: true }
      );

      if (!updatedFolder) {
        throw new AppError('Folder not found', 404);
      }

      return updatedFolder;
    } catch (error: any) {
      // Handle duplicate folder name error
      if (error.code === 11000) {
        throw new AppError('Folder with this name already exists', 400);
      }
      throw error;
    }
  }

  /**
   * Delete a folder and optionally move its notes to another folder
   */
  static async deleteFolder(
    folderId: string,
    userId: string,
    targetFolderId?: string
  ): Promise<void> {
    // Verify folder belongs to user
    const folder = await Folder.findOne({ _id: folderId, user: userId });
    if (!folder) {
      throw new AppError('Folder not found', 404);
    }

    // If target folder is provided, verify it belongs to user
    if (targetFolderId) {
      const targetFolder = await Folder.findOne({ _id: targetFolderId, user: userId });
      if (!targetFolder) {
        throw new AppError('Target folder not found', 404);
      }

      // Move notes to target folder
      await Note.updateMany({ folder: folderId, user: userId }, { folder: targetFolderId });
    } else {
      // Remove folder reference from all notes
      await Note.updateMany({ folder: folderId, user: userId }, { folder: null });
    }

    // Delete folder
    await Folder.deleteOne({ _id: folderId });
  }
}
