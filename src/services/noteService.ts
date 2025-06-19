import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import Note, { INote } from '../models/Note';
import Folder from '../models/Folder';

interface NoteInput {
  title: string;
  content: string;
  folder?: string;
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
}

export class NoteService {
  /**
   * Create a new note for a user
   */
  static async createNote(userId: string, noteInput: NoteInput): Promise<INote> {
    const { folder, ...rest } = noteInput;

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
      user: userId,
    });

    return note;
  }

  /**
   * Get a note by ID, ensuring it belongs to the given user
   */
  static async getNoteById(noteId: string, userId: string): Promise<INote> {
    const note = await Note.findOne({ _id: noteId, user: userId });
    if (!note) {
      throw new AppError('Note not found', 404);
    }
    return note;
  }

  /**
   * Update a note, ensuring it belongs to the given user
   */
  static async updateNote(
    noteId: string,
    userId: string,
    updates: Partial<NoteInput>
  ): Promise<INote> {
    const { folder, ...restUpdates } = updates;

    // Validate folder if provided
    if (folder) {
      const folderExists = await Folder.findOne({ _id: folder, user: userId });
      if (!folderExists) {
        throw new AppError('Folder not found or does not belong to user', 404);
      }
    }

    // Find and update note
    const updatedNote = await Note.findOneAndUpdate(
      { _id: noteId, user: userId },
      { ...restUpdates, folder: folder || null },
      { new: true, runValidators: true }
    );

    if (!updatedNote) {
      throw new AppError('Note not found', 404);
    }

    return updatedNote;
  }

  /**
   * Delete a note, ensuring it belongs to the given user
   */
  static async deleteNote(noteId: string, userId: string): Promise<void> {
    const result = await Note.deleteOne({ _id: noteId, user: userId });

    if (result.deletedCount === 0) {
      throw new AppError('Note not found', 404);
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
    } = options;

    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { user: userId };

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
