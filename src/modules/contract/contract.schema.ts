import { body, param, query } from 'express-validator'

export const createContractSchema = [
  body('resident_id').notEmpty().withMessage('Resident ID is required').isUUID(),
  body('family_user_id').optional().isUUID(),
  body('contract_number').notEmpty().withMessage('Contract number is required').isString(),
  body('payment_frequency')
    .notEmpty()
    .withMessage('Payment frequency is required')
    .isIn(['monthly', 'annually'])
    .withMessage('Payment frequency must be monthly or annually'),
  body('total_amount')
    .notEmpty()
    .withMessage('Total amount is required')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),
  body('start_date').notEmpty().withMessage('Start date is required').isISO8601(),
  body('end_date').optional().isISO8601(),
  body('room_id').optional().isUUID(),
  body('notes').optional().isString(),
  body('service_packages').isArray({ min: 1 }).withMessage('At least one service package is required'),
  body('service_packages.*.package_id').isUUID(),
  body('service_packages.*.price_at_signing').isFloat({ min: 0 }),
  body('service_packages.*.start_date').isISO8601(),
  body('service_packages.*.end_date').optional().isISO8601()
]

export const updateContractSchema = [
  param('contract_id').isUUID().withMessage('Contract ID must be a valid UUID'),
  body('status')
    .optional()
    .isIn(['active', 'expired', 'cancelled'])
    .withMessage('Status must be active, expired, or cancelled'),
  body('payment_frequency')
    .optional()
    .isIn(['monthly', 'annually'])
    .withMessage('Payment frequency must be monthly or annually'),
  body('total_amount').optional().isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('signed_date').optional().isISO8601(),
  body('room_id').optional().isUUID(),
  body('notes').optional().isString()
]

export const contractIdSchema = [param('contract_id').isUUID().withMessage('Contract ID must be a valid UUID')]

export const getContractsSchema = [
  query('status')
    .optional()
    .isIn(['active', 'expired', 'cancelled'])
    .withMessage('Status must be active, expired, or cancelled'),
  query('resident_id').optional().isUUID(),
  query('family_user_id').optional().isUUID(),
  query('take').optional().isInt({ min: 1 }).withMessage('take must be a positive integer'),
  query('skip').optional().isInt({ min: 0 }).withMessage('skip must be a non-negative integer')
]

export const addServiceToContractSchema = [
  param('contract_id').isUUID().withMessage('Contract ID must be a valid UUID'),
  body('package_id').notEmpty().withMessage('Package ID is required').isUUID(),
  body('price_at_signing')
    .notEmpty()
    .withMessage('Price at signing is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('start_date').notEmpty().withMessage('Start date is required').isISO8601(),
  body('end_date').optional().isISO8601()
]

export const updateContractServiceSchema = [
  param('contract_service_id').isUUID().withMessage('Contract service ID must be a valid UUID'),
  body('status')
    .optional()
    .isIn(['active', 'expired', 'cancelled'])
    .withMessage('Status must be active, expired, or cancelled'),
  body('end_date').optional().isISO8601(),
  body('notes').optional().isString()
]

export const signContractSchema = [
  param('contract_id').isUUID().withMessage('Contract ID must be a valid UUID'),
  body('signed_date').notEmpty().withMessage('Signed date is required').isISO8601(),
  body('room_id').optional().isUUID()
]
