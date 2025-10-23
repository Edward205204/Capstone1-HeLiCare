import { body, param, query } from 'express-validator'
import { CareLogType, CareTaskStatus, MedicationStatus } from '@prisma/client'

export const createCareLogSchema = [
  body('resident_id')
    .isUUID()
    .withMessage('Invalid resident ID'),
  
  body('activity_id')
    .optional()
    .isUUID()
    .withMessage('Invalid activity ID'),
  
  body('schedule_id')
    .optional()
    .isUUID()
    .withMessage('Invalid schedule ID'),
  
  body('type')
    .isIn(Object.values(CareLogType))
    .withMessage('Invalid care log type'),
  
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
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid date'),
  
  // Medication fields
  body('medication_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Medication name must not exceed 100 characters'),
  
  body('dosage')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Dosage must not exceed 50 characters'),
  
  body('medication_status')
    .optional()
    .isIn(Object.values(MedicationStatus))
    .withMessage('Invalid medication status'),
  
  // Meal fields
  body('meal_type')
    .optional()
    .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
    .withMessage('Invalid meal type'),
  
  body('food_items')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Food items must not exceed 200 characters'),
  
  body('quantity')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Quantity must not exceed 50 characters'),
  
  // Exercise fields
  body('exercise_type')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Exercise type must not exceed 100 characters'),
  
  body('duration_minutes')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes'),
  
  body('intensity')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid intensity level'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
]

export const updateCareLogSchema = [
  param('care_log_id')
    .isUUID()
    .withMessage('Invalid care log ID'),
  
  body('type')
    .optional()
    .isIn(Object.values(CareLogType))
    .withMessage('Invalid care log type'),
  
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
  
  body('status')
    .optional()
    .isIn(Object.values(CareTaskStatus))
    .withMessage('Invalid care task status'),
  
  // Medication fields
  body('medication_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Medication name must not exceed 100 characters'),
  
  body('dosage')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Dosage must not exceed 50 characters'),
  
  body('medication_status')
    .optional()
    .isIn(Object.values(MedicationStatus))
    .withMessage('Invalid medication status'),
  
  // Meal fields
  body('meal_type')
    .optional()
    .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
    .withMessage('Invalid meal type'),
  
  body('food_items')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Food items must not exceed 200 characters'),
  
  body('quantity')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Quantity must not exceed 50 characters'),
  
  // Exercise fields
  body('exercise_type')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Exercise type must not exceed 100 characters'),
  
  body('duration_minutes')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes'),
  
  body('intensity')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid intensity level'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
]

export const getCareLogByIdSchema = [
  param('care_log_id')
    .isUUID()
    .withMessage('Invalid care log ID')
]

export const getCareLogsSchema = [
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
  
  query('type')
    .optional()
    .isIn(Object.values(CareLogType))
    .withMessage('Invalid care log type'),
  
  query('status')
    .optional()
    .isIn(Object.values(CareTaskStatus))
    .withMessage('Invalid care task status'),
  
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search term must not exceed 100 characters')
]
