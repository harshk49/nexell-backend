import { AppError } from '../utils/AppError';
import Folder, { IFolder } from '../models/Folder';
import Note from '../models/Note';

interface FolderInput {
  name: string;
  organization?: string;
}

export class FolderService {
  /**
   * Create a new folder for a user, optionally within an organization context
   */
  static async createFolder(userId: string, folderInput: FolderInput): Promise<IFolder> {
    const { organization, ...rest } = folderInput;

    try {
      const folder = await Folder.create({
        ...rest,
        user: userId,
        organization: organization || null,
      });
      return folder;
    } catch (error: any) {
      // Handle duplicate folder name error
      if (error.code === 11000) {
        throw new AppError('Folder with this name already exists in this context', 400);
      }
      throw error;
    }
  }

  /**
   * Get all folders for a user, optionally within an organization context
   */
  static async getFolders(userId: string, orgId?: string): Promise<IFolder[]> {
    const filter: any = {};

    // If organization context is provided, show org folders and user's personal folders
    if (orgId) {
      filter.$or = [
        { user: userId, organization: null }, // User's personal folders
        { organization: orgId }, // Organization folders
      ];
    } else {
      // Only show user's personal folders when no organization context
      filter.user = userId;
      filter.organization = null;
    }

    const folders = await Folder.find(filter).sort({ name: 1 });
    return folders;
  }

  /**
   * Get a folder by ID, ensuring it belongs to the given user or organization
   */
  static async getFolderById(folderId: string, userId: string, orgId?: string): Promise<IFolder> {
    const filter: any = { _id: folderId };

    // If organization context is provided
    if (orgId) {
      filter.$or = [{ user: userId, organization: null }, { organization: orgId }];
    } else {
      filter.user = userId;
      filter.organization = null;
    }

    const folder = await Folder.findOne(filter);
    if (!folder) {
      throw new AppError('Folder not found', 404);
    }
    return folder;
  }

  /**
   * Update a folder, ensuring it belongs to the given user or organization
   */
  static async updateFolder(
    folderId: string,
    userId: string,
    updates: FolderInput,
    orgId?: string
  ): Promise<IFolder> {
    try {
      // Build filter based on user and org context
      const filter: any = { _id: folderId };

      // If organization context is provided
      if (orgId) {
        filter.$or = [{ user: userId, organization: null }, { organization: orgId }];
      } else {
        filter.user = userId;
        filter.organization = null;
      }

      // Don't allow changing the organization through updates
      const { organization, ...restUpdates } = updates;

      const updatedFolder = await Folder.findOneAndUpdate(filter, restUpdates, {
        new: true,
        runValidators: true,
      });

      if (!updatedFolder) {
        throw new AppError('Folder not found or you do not have permission to update it', 404);
      }

      return updatedFolder;
    } catch (error: any) {
      // Handle duplicate folder name error
      if (error.code === 11000) {
        throw new AppError('Folder with this name already exists in this context', 400);
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
    targetFolderId?: string,
    orgId?: string
  ): Promise<void> {
    // Build filter based on user and org context
    const filter: any = { _id: folderId };

    // If organization context is provided
    if (orgId) {
      filter.$or = [{ user: userId, organization: null }, { organization: orgId }];
    } else {
      filter.user = userId;
      filter.organization = null;
    }

    // Verify folder exists and user has access
    const folder = await Folder.findOne(filter);
    if (!folder) {
      throw new AppError('Folder not found or you do not have permission to delete it', 404);
    }

    // Create note filter based on folder and context
    const noteFilter: any = { folder: folderId };
    if (orgId) {
      noteFilter.$or = [{ user: userId, organization: null }, { organization: orgId }];
    } else {
      noteFilter.user = userId;
      noteFilter.organization = null;
    }

    // If target folder is provided, verify it exists and user has access
    if (targetFolderId) {
      const targetFolderFilter: any = { _id: targetFolderId };

      if (orgId) {
        targetFolderFilter.$or = [{ user: userId, organization: null }, { organization: orgId }];
      } else {
        targetFolderFilter.user = userId;
        targetFolderFilter.organization = null;
      }

      const targetFolder = await Folder.findOne(targetFolderFilter);
      if (!targetFolder) {
        throw new AppError('Target folder not found or you do not have permission to use it', 404);
      }

      // Move notes to target folder
      await Note.updateMany(noteFilter, { folder: targetFolderId });
    } else {
      // Remove folder reference from all notes
      await Note.updateMany(noteFilter, { folder: null });
    }

    // Delete folder
    await Folder.deleteOne({ _id: folder._id });
  }
}
