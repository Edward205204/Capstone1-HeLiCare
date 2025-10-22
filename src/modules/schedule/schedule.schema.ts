import { body, param, query } from 'express-validator'
import { ActivityStatus, ScheduleFrequency } from '@prisma/client'

export const createScheduleSchema = [
  body('activity_id')
    .isUUID()
    .withMessage('Invalid activity ID'),
  
  body('resident_id')
    .optional()
    .isUUID()
    .withMessage('Invalid resident ID'),
  
  body('staff_id')
    .optional()
    .isUUID()
    .withMessage('Invalid staff ID'),
  
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Title must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('start_time')
    .isISO8601()
    .withMessage('Start time must be a valid date'),
  
  body('end_time')
    .isISO8601()
    .withMessage('End time must be a valid date')
    .custom((value, { req }) => {
      const startTime = new Date(req.body.start_time)
      const endTime = new Date(value)
      
      if (endTime <= startTime) {
        throw new Error('End time must be after start time')
      }
      
      return true
    }),
  
  body('frequency')
    .isIn(Object.values(ScheduleFrequency))
    .withMessage('Invalid schedule frequency'),
  
  body('is_recurring')
    .optional()
    .isBoolean()
    .withMessage('is_recurring must be a boolean'),
  
  body('recurring_until')
    .optional()
    .isISO8601()
    .withMessage('Recurring until must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.start_time) {
        const startTime = new Date(req.body.start_time)
        const recurringUntil = new Date(value)
        
        if (recurringUntil <= startTime) {
          throw new Error('Recurring until must be after start time')
        }
      }
      
      return true
    }),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
]

export const updateScheduleSchema = [
  param('schedule_id')
    .isUUID()
    .withMessage('Invalid schedule ID'),
  
  body('activity_id')
    .optional()
    .isUUID()
    .withMessage('Invalid activity ID'),
  
  body('resident_id')
    .optional()
    .isUUID()
    .withMessage('Invalid resident ID'),
  
  body('staff_id')
    .optional()
    .isUUID()
    .withMessage('Invalid staff ID'),
  
  body('title')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Title must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('start_time')
    .optional()
    .isISO8601()
    .withMessage('Start time must be a valid date'),
  
  body('end_time')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid date'),
  
  body('frequency')
    .optional()
    .isIn(Object.values(ScheduleFrequency))
    .withMessage('Invalid schedule frequency'),
  
  body('is_recurring')
    .optional()
    .isBoolean()
    .withMessage('is_recurring must be a boolean'),
  
  body('recurring_until')
    .optional()
    .isISO8601()
    .withMessage('Recurring until must be a valid date'),
  
  body('status')
    .optional()
    .isIn(Object.values(ActivityStatus))
    .withMessage('Invalid activity status'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
]

export const getScheduleByIdSchema = [
  param('schedule_id')
    .isUUID()
    .withMessage('Invalid schedule ID')
]

export const getSchedulesSchema = [
  query('take')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Take must be between 1 and 100'),
  
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Skip must be a non-negative integer'),
  
  query('resident_id')
    .optional()
    .isUUID()
    .withMessage('Invalid resident ID'),
  
  query('staff_id')
    .optional()
    .isUUID()
    .withMessage('Invalid staff ID'),
  
  query('activity_id')
    .optional()
    .isUUID()
    .withMessage('Invalid activity ID'),
  
  query('status')
    .optional()
    .isIn(Object.values(ActivityStatus))
    .withMessage('Invalid activity status'),
  
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  query('frequency')
    .optional()
    .isIn(Object.values(ScheduleFrequency))
    .withMessage('Invalid schedule frequency'),
  
  query('is_recurring')
    .optional()
    .isBoolean()
    .withMessage('is_recurring must be a boolean'),
  
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search term must not exceed 100 characters')
]
