import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import Note, { INote } from '../models/Note';
import Folder from '../models/Folder';

interface NoteInput {
  title: string;
  content: string;
  folder?: string;
  organization?: string;
  tags?: string[];
}

interface NotesQueryOptions {
  page?: number;
  limit?: number;
  folder?: string;
  tag?: string;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  organization?: string;
}

export class NoteService {
  /**
   * Create a new note for a user
   */
  static async createNote(userId: string, noteInput: NoteInput): Promise<INote> {
    const { folder, organization, ...rest } = noteInput;

    // Validate folder if provided
    if (folder) {
      const folderExists = await Folder.findOne({ _id: folder, user: userId });
      if (!folderExists) {
        throw new AppError('Folder not found or does not belong to user', 404);
      }
    }

    // Create note
    const note = await Note.create({
      ...rest,
      folder: folder || null,
      organization: organization || null,
      user: userId,
    });

    return note;
  }

  /**
   * Get a note by ID, ensuring it belongs to the given user or shared organization
   */
  static async getNoteById(noteId: string, userId: string, orgId?: string): Promise<INote> {
    const filter: any = { _id: noteId };

    // If orgId is provided, check for notes in that org, otherwise just check user ownership
    if (orgId) {
      filter.$or = [{ user: userId }, { organization: orgId }];
    } else {
      filter.user = userId;
    }

    const note = await Note.findOne(filter);
    if (!note) {
      throw new AppError('Note not found', 404);
    }
    return note;
  }

  /**
   * Update a note, ensuring it belongs to the given user or shared organization
   */
  static async updateNote(
    noteId: string,
    userId: string,
    updates: Partial<NoteInput>,
    orgId?: string
  ): Promise<INote> {
    const { folder, organization, ...restUpdates } = updates;

    // Validate folder if provided
    if (folder) {
      const folderExists = await Folder.findOne({ _id: folder, user: userId });
      if (!folderExists) {
        throw new AppError('Folder not found or does not belong to user', 404);
      }
    }

    // Build filter based on user and org context
    const filter: any = { _id: noteId };

    // If organization context is provided
    if (orgId) {
      filter.$or = [{ user: userId }, { organization: orgId }];
    } else {
      filter.user = userId;
    }

    // Find and update note
    const updatedNote = await Note.findOneAndUpdate(
      filter,
      {
        ...restUpdates,
        folder: folder || null,
        organization: organization || undefined, // Only update organization if provided
      },
      { new: true, runValidators: true }
    );

    if (!updatedNote) {
      throw new AppError('Note not found or you do not have permission to update it', 404);
    }

    return updatedNote;
  }

  /**
   * Delete a note, ensuring it belongs to the given user or shared organization
   */
  static async deleteNote(noteId: string, userId: string, orgId?: string): Promise<void> {
    // Build filter based on user and org context
    const filter: any = { _id: noteId };

    // If organization context is provided
    if (orgId) {
      filter.$or = [{ user: userId }, { organization: orgId }];
    } else {
      filter.user = userId;
    }

    const result = await Note.deleteOne(filter);

    if (result.deletedCount === 0) {
      throw new AppError('Note not found or you do not have permission to delete it', 404);
    }
  }

  /**
   * Query notes with filters, pagination and sorting
   */
  static async getNotes(
    userId: string,
    options: NotesQueryOptions = {}
  ): Promise<{ notes: INote[]; totalCount: number; totalPages: number; currentPage: number }> {
    const {
      page = 1,
      limit = 10,
      folder,
      tag,
      search,
      sortBy = 'createdAt',
      sortDirection = 'desc',
      organization,
    } = options;

    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    // If organization context is provided, show notes from organization or user's personal notes
    if (organization) {
      filter.$or = [
        { user: userId, organization: null }, // User's personal notes
        { organization: organization }, // Organization notes
      ];
    } else {
      // Only show user's personal notes when no organization context
      filter.user = userId;
      filter.organization = null;
    }

    // Add folder filter if specified
    if (folder) {
      filter.folder = folder;
    }

    // Add tag filter if specified
    if (tag) {
      filter.tags = tag;
    }

    // Build filter with regular expression search instead of text search
    if (search) {
      const searchRegex = new RegExp(search, 'i'); // case-insensitive search
      filter.$or = [{ title: searchRegex }, { content: searchRegex }];
    }

    // Count total matching documents
    const totalCount = await Note.countDocuments(filter);

    // Build sort object
    const sort: Record<string, any> = {};
    sort[sortBy] = sortDirection === 'asc' ? 1 : -1;

    // Execute query with pagination and sorting
    let notesQuery = Note.find(filter);

    // Execute the query
    const notes = (await notesQuery
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean() // Convert to plain JavaScript objects
      .exec()) as unknown as INote[];

    return {
      notes,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  }
}
