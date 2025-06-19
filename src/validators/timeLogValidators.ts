import { body, query, param } from 'express-validator';
import mongoose from 'mongoose';

export const timeLogValidationRules = {
  // Validation for starting a timer
  startTimer: [
    body('task')
      .optional()
      .isMongoId()
      .withMessage('Invalid task ID format'),
    body('startTime')
      .optional()
      .isISO8601()
      .withMessage('Start time must be a valid ISO 8601 date')
      .toDate(),
    body('note')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Note cannot be more than 1000 characters'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
      .custom((tags) => {
        if (tags.length > 10) {
          return false;
        }
        return true;
      })
      .withMessage('Maximum of 10 tags are allowed'),
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be between 1 and 50 characters'),
    body('organization')
      .optional()
      .isMongoId()
      .withMessage('Invalid organization ID format'),
  ],

  // Validation for stopping a timer
  stopTimer: [
    body('endTime')
      .optional()
      .isISO8601()
      .withMessage('End time must be a valid ISO 8601 date')
      .toDate()
      .custom((endTime) => {
        return endTime <= new Date();
      })
      .withMessage('End time cannot be in the future'),
    body('note')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Note cannot be more than 1000 characters'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
      .custom((tags) => {
        if (tags.length > 10) {
          return false;
        }
        return true;
      })
      .withMessage('Maximum of 10 tags are allowed'),
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be between 1 and 50 characters'),
  ],

  // Validation for creating a manual time entry
  createManual: [
    body('task')
      .optional()
      .isMongoId()
      .withMessage('Invalid task ID format'),
    body('startTime')
      .exists()
      .withMessage('Start time is required')
      .isISO8601()
      .withMessage('Start time must be a valid ISO 8601 date')
      .toDate()
      .custom((startTime) => {
        // Check if the date is not more than 1 year in the past
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return startTime >= oneYearAgo;
      })
      .withMessage('Start time cannot be more than 1 year in the past'),
    body('endTime')
      .exists()
      .withMessage('End time is required')
      .isISO8601()
      .withMessage('End time must be a valid ISO 8601 date')
      .toDate()
      .custom((endTime, { req }) => {
        // Check if end time is after start time
        const startTime = req.body.startTime;
        if (startTime && endTime <= new Date(startTime)) {
          return false;
        }
        // Check if end time is not in the future
        return endTime <= new Date();
      })
      .withMessage('End time must be after start time and not in the future'),
    body('note')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Note cannot be more than 1000 characters'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
      .custom((tags) => {
        if (tags.length > 10) {
          return false;
        }
        return true;
      })
      .withMessage('Maximum of 10 tags are allowed'),
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be between 1 and 50 characters'),
    body('organization')
      .optional()
      .isMongoId()
      .withMessage('Invalid organization ID format'),
  ],

  // Validation for updating a time log
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid time log ID'),
    body('task')
      .optional()
      .isMongoId()
      .withMessage('Invalid task ID format'),
    body('startTime')
      .optional()
      .isISO8601()
      .withMessage('Start time must be a valid ISO 8601 date')
      .toDate()
      .custom((startTime) => {
        // Check if the date is not more than 1 year in the past
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return startTime >= oneYearAgo;
      })
      .withMessage('Start time cannot be more than 1 year in the past'),
    body('endTime')
      .optional()
      .isISO8601()
      .withMessage('End time must be a valid ISO 8601 date')
      .toDate()
      .custom((endTime) => {
        // Check if end time is not in the future
        return endTime <= new Date();
      })
      .withMessage('End time cannot be in the future'),
    body('note')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Note cannot be more than 1000 characters'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
      .custom((tags) => {
        if (tags.length > 10) {
          return false;
        }
        return true;
      })
      .withMessage('Maximum of 10 tags are allowed'),
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be between 1 and 50 characters'),
  ],

  // Validation for querying time logs
  queryFilters: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date')
      .toDate(),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .toDate()
      .custom((endDate, { req }) => {
        if (req && req.query && req.query.startDate) {
          const startDate = req.query.startDate;
          return new Date(endDate) >= new Date(startDate);
        }
        return true;
      })
      .withMessage('End date must be after start date'),
    query('taskId')
      .optional()
      .isMongoId()
      .withMessage('Invalid task ID format'),
    query('tag')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Tag must be between 1 and 50 characters'),
  ],
};
