import { Request, Response, NextFunction } from 'express'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { prisma } from '~/utils/db'
import { body, param, query, ValidationChain, validationResult } from 'express-validator'
import { wrapRequestHandler } from '~/utils/handler'

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: 'Validation error',
      errors: errors.array()
    })
  }
  next()
}

// Create Payment Validators
export const createPaymentSchema: ValidationChain[] = [
  body('contract_id')
    .notEmpty()
    .withMessage('Contract ID is required')
    .isString()
    .withMessage('Contract ID must be a string')
    .isUUID()
    .withMessage('Contract ID must be a valid UUID'),
  body('payment_method')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['COD', 'momo', 'bank_transfer', 'visa', 'paypal'])
    .withMessage('Payment method must be one of: COD, momo, bank_transfer, visa, paypal'),
  body('payment_period_start')
    .notEmpty()
    .withMessage('Payment period start date is required')
    .isISO8601()
    .withMessage('Payment period start must be a valid ISO date string'),
  body('payment_period_end')
    .notEmpty()
    .withMessage('Payment period end date is required')
    .isISO8601()
    .withMessage('Payment period end must be a valid ISO date string')
    .custom((value, { req }) => {
      const startDate = new Date(req.body.payment_period_start)
      const endDate = new Date(value)
      if (endDate <= startDate) {
        throw new Error('Payment period end date must be after start date')
      }
      return true
    }),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
]

// Initiate Momo Payment Validators
export const initiateMomoPaymentSchema: ValidationChain[] = [
  param('payment_id')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isString()
    .withMessage('Payment ID must be a string')
    .isUUID()
    .withMessage('Payment ID must be a valid UUID'),
  body('return_url')
    .optional()
    .isURL()
    .withMessage('Return URL must be a valid URL'),
  body('notify_url')
    .optional()
    .isURL()
    .withMessage('Notify URL must be a valid URL')
]

// Get Payments Validators
export const getPaymentsSchema: ValidationChain[] = [
  query('contract_id').optional().isUUID().withMessage('Contract ID must be a valid UUID'),
  query('status').optional().isIn(['paid', 'overdue', 'pending', 'failed', 'cancelled', 'refunded']).withMessage('Invalid payment status'),
  query('payment_method').optional().isIn(['COD', 'momo', 'bank_transfer', 'visa', 'paypal']).withMessage('Invalid payment method'),
  query('start_date').optional().isISO8601().withMessage('Start date must be a valid ISO date string'),
  query('end_date').optional().isISO8601().withMessage('End date must be a valid ISO date string'),
  query('take').optional().isInt({ min: 1, max: 100 }).withMessage('Take must be between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer')
]

// Payment ID Validator
export const paymentIdValidator = wrapRequestHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { payment_id } = req.params

  const payment = await prisma.payment.findUnique({
    where: { payment_id }
  })

  if (!payment) {
    throw new ErrorWithStatus({
      message: 'Payment not found',
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  ;(req as any).payment = payment
  next()
})

// Contract ID Validator
export const contractIdValidator = wrapRequestHandler(async (req: Request, res: Response, next: NextFunction) => {
  const contract_id = req.body.contract_id || req.params.contract_id

  if (!contract_id) {
    throw new ErrorWithStatus({
      message: 'Contract ID is required',
      status: HTTP_STATUS.BAD_REQUEST
    })
  }

  const contract = await prisma.contract.findUnique({
    where: { contract_id }
  })

  if (!contract) {
    throw new ErrorWithStatus({
      message: 'Contract not found',
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  ;(req as any).contract = contract
  next()
})

// Check if user can access payment
export const canAccessPayment = wrapRequestHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user_id = req.decoded_authorization?.user_id as string
  const user_role = req.decoded_authorization?.role as string
  const payment = (req as any).payment

  // Admin and Staff can access all payments in their institution
  if (user_role === 'Admin' || user_role === 'Staff') {
    const institution_id = req.decoded_authorization?.institution_id as string
    if (payment.institution_id !== institution_id) {
      throw new ErrorWithStatus({
        message: 'You do not have access to this payment',
        status: HTTP_STATUS.FORBIDDEN
      })
    }
    return next()
  }

  // Family can only access their own payments
  if (user_role === 'Family') {
    if (payment.family_user_id !== user_id) {
      throw new ErrorWithStatus({
        message: 'You do not have access to this payment',
        status: HTTP_STATUS.FORBIDDEN
      })
    }
    return next()
  }

  throw new ErrorWithStatus({
    message: 'Unauthorized',
    status: HTTP_STATUS.FORBIDDEN
  })
})

// Check if user is Family
export const isFamily = wrapRequestHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user_role = req.decoded_authorization?.role as string

  if (user_role !== 'Family') {
    throw new ErrorWithStatus({
      message: 'Only family members can perform this action',
      status: HTTP_STATUS.FORBIDDEN
    })
  }

  next()
})

// Check if user is Admin or Staff
export const isAdminOrStaff = wrapRequestHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user_role = req.decoded_authorization?.role as string

  if (user_role !== 'Admin' && user_role !== 'Staff') {
    throw new ErrorWithStatus({
      message: 'Only admin or staff can perform this action',
      status: HTTP_STATUS.FORBIDDEN
    })
  }

  next()
})

// Create Payment Validator
export const createPaymentValidator = [
  ...createPaymentSchema,
  validateRequest,
  contractIdValidator
]

// Get Payment By ID Validator
export const getPaymentByIdValidator = [
  param('payment_id')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isString()
    .withMessage('Payment ID must be a string')
    .isUUID()
    .withMessage('Payment ID must be a valid UUID'),
  validateRequest,
  paymentIdValidator,
  canAccessPayment
]

// Initiate Momo Payment Validator
export const initiateMomoPaymentValidator = [
  ...initiateMomoPaymentSchema,
  validateRequest,
  paymentIdValidator,
  canAccessPayment
]

// Confirm COD Payment Validator
export const confirmCODPaymentValidator = [
  param('payment_id')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isString()
    .withMessage('Payment ID must be a string')
    .isUUID()
    .withMessage('Payment ID must be a valid UUID'),
  validateRequest,
  paymentIdValidator,
  isAdminOrStaff
]

// Update Payment Status Validator
export const updatePaymentStatusValidator = [
  param('payment_id')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isString()
    .withMessage('Payment ID must be a string')
    .isUUID()
    .withMessage('Payment ID must be a valid UUID'),
  body('status')
    .notEmpty()
    .withMessage('Payment status is required')
    .isIn(['paid', 'overdue', 'pending', 'failed', 'cancelled', 'refunded'])
    .withMessage('Payment status must be one of: paid, overdue, pending, failed, cancelled, refunded'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
  body('paid_date')
    .optional()
    .isISO8601()
    .withMessage('Paid date must be a valid ISO date string'),
  validateRequest,
  paymentIdValidator,
  isAdminOrStaff
]

// Get Payments Validator
export const getPaymentsValidator = [
  ...getPaymentsSchema,
  validateRequest
]

// Get Payments By Contract Validator
export const getPaymentsByContractValidator = [
  param('contract_id')
    .notEmpty()
    .withMessage('Contract ID is required')
    .isString()
    .withMessage('Contract ID must be a string')
    .isUUID()
    .withMessage('Contract ID must be a valid UUID'),
  validateRequest,
  contractIdValidator
]

// Generate Payment Schedule Validator
export const generatePaymentScheduleValidator = [
  param('contract_id')
    .notEmpty()
    .withMessage('Contract ID is required')
    .isString()
    .withMessage('Contract ID must be a string')
    .isUUID()
    .withMessage('Contract ID must be a valid UUID'),
  query('start_date')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO date string'),
  query('end_date')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO date string'),
  validateRequest,
  contractIdValidator
]

