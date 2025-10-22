import { body, param, query } from 'express-validator'
import { ActivityType } from '@prisma/client'

export const createActivitySchema = [
  body('name')
    .notEmpty()
    .withMessage('Activity name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Activity name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('type')
    .isIn(Object.values(ActivityType))
    .withMessage('Invalid activity type'),
  
  body('duration_minutes')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes'),
  
  body('max_participants')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max participants must be between 1 and 100')
]

export const updateActivitySchema = [
  param('activity_id')
    .isUUID()
    .withMessage('Invalid activity ID'),
  
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Activity name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('type')
    .optional()
    .isIn(Object.values(ActivityType))
    .withMessage('Invalid activity type'),
  
  body('duration_minutes')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes'),
  
  body('max_participants')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max participants must be between 1 and 100'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
]

export const getActivityByIdSchema = [
  param('activity_id')
    .isUUID()
    .withMessage('Invalid activity ID')
]

export const getActivitiesSchema = [
  query('take')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Take must be between 1 and 100'),
  
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Skip must be a non-negative integer'),
  
  query('type')
    .optional()
    .isIn(Object.values(ActivityType))
    .withMessage('Invalid activity type'),
  
  query('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search term must not exceed 100 characters')
]
