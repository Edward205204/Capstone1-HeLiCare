import { body, param, query } from 'express-validator'

export const createServicePackageSchema = [
  body('name').notEmpty().withMessage('Package name is required').isString(),
  body('description').optional().isString(),
  body('type')
    .notEmpty()
    .withMessage('Package type is required')
    .isIn(['base', 'add_on', 'special'])
    .withMessage('Type must be base, add_on, or special'),
  body('price_monthly')
    .notEmpty()
    .withMessage('Monthly price is required')
    .isFloat({ min: 0 })
    .withMessage('Monthly price must be a positive number'),
  body('price_annually').optional().isFloat({ min: 0 }).withMessage('Annual price must be a positive number'),
  body('room_type')
    .optional()
    .isIn(['single', 'double', 'multi'])
    .withMessage('Room type must be single, double, or multi'),
  body('includes_room').optional().isBoolean().withMessage('includes_room must be a boolean'),
  body('features').optional().isObject().withMessage('Features must be an object'),
  body('max_residents').optional().isInt({ min: 1 }).withMessage('max_residents must be a positive integer')
]

export const updateServicePackageSchema = [
  param('package_id').isUUID().withMessage('Package ID must be a valid UUID'),
  body('name').optional().isString(),
  body('description').optional().isString(),
  body('type').optional().isIn(['base', 'add_on', 'special']).withMessage('Type must be base, add_on, or special'),
  body('price_monthly').optional().isFloat({ min: 0 }).withMessage('Monthly price must be a positive number'),
  body('price_annually').optional().isFloat({ min: 0 }).withMessage('Annual price must be a positive number'),
  body('room_type')
    .optional()
    .isIn(['single', 'double', 'multi'])
    .withMessage('Room type must be single, double, or multi'),
  body('includes_room').optional().isBoolean().withMessage('includes_room must be a boolean'),
  body('features').optional().isObject().withMessage('Features must be an object'),
  body('max_residents').optional().isInt({ min: 1 }).withMessage('max_residents must be a positive integer'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
]

export const packageIdSchema = [param('package_id').isUUID().withMessage('Package ID must be a valid UUID')]

export const getServicePackagesSchema = [
  query('type').optional().isIn(['base', 'add_on', 'special']).withMessage('Type must be base, add_on, or special'),
  query('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  query('room_type')
    .optional()
    .isIn(['single', 'double', 'multi'])
    .withMessage('Room type must be single, double, or multi'),
  query('take').optional().isInt({ min: 1 }).withMessage('take must be a positive integer'),
  query('skip').optional().isInt({ min: 0 }).withMessage('skip must be a non-negative integer')
]
