import { body, param, query } from 'express-validator'

export const createPaymentSchema = [
  body('contract_id').notEmpty().withMessage('Contract ID is required').isUUID(),
  body('amount').notEmpty().withMessage('Amount is required').isFloat({ min: 0 }),
  body('method')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['COD', 'paypal', 'bank_transfer', 'visa'])
    .withMessage('Payment method must be COD, paypal, bank_transfer, or visa'),
  body('due_date').notEmpty().withMessage('Due date is required').isISO8601(),
  body('notes').optional().isString(),
  body('payment_items').isArray({ min: 1 }).withMessage('At least one payment item is required'),
  body('payment_items.*.package_id').isUUID(),
  body('payment_items.*.contract_service_id').optional().isUUID(),
  body('payment_items.*.item_name').notEmpty().isString(),
  body('payment_items.*.quantity').isInt({ min: 1 }),
  body('payment_items.*.unit_price').isFloat({ min: 0 }),
  body('payment_items.*.total_price').isFloat({ min: 0 }),
  body('payment_items.*.period_start').isISO8601(),
  body('payment_items.*.period_end').isISO8601()
]

export const generatePaymentsSchema = [
  param('contract_id').isUUID().withMessage('Contract ID must be a valid UUID'),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601()
]

export const paymentIdSchema = [
  param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID')
]

export const initiatePayPalPaymentSchema = [
  param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID'),
  body('return_url').notEmpty().withMessage('Return URL is required').isURL(),
  body('cancel_url').notEmpty().withMessage('Cancel URL is required').isURL()
]

export const capturePayPalPaymentSchema = [
  param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID'),
  body('order_id').notEmpty().withMessage('Order ID is required').isString()
]

export const getPaymentsSchema = [
  query('contract_id').optional().isUUID(),
  query('family_user_id').optional().isUUID(),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'overdue']),
  query('method').optional().isIn(['COD', 'paypal', 'bank_transfer', 'visa']),
  query('take').optional().isInt({ min: 1, max: 100 }),
  query('skip').optional().isInt({ min: 0 })
]

export const updatePaymentStatusSchema = [
  param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'overdue']),
  body('payment_reference').optional().isString(),
  body('failure_reason').optional().isString(),
  body('metadata').optional(),
  body('paid_at').optional().isISO8601()
]

export const processCODPaymentSchema = [
  param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID'),
  body('notes').optional().isString()
]

export const processBankTransferSchema = [
  param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID'),
  body('bank_name').notEmpty().withMessage('Bank name is required').isString(),
  body('account_number').notEmpty().withMessage('Account number is required').isString(),
  body('transaction_reference').notEmpty().withMessage('Transaction reference is required').isString(),
  body('notes').optional().isString()
]

export const processVisaPaymentSchema = [
  param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID'),
  body('card_last_four').notEmpty().withMessage('Card last four digits is required').matches(/^\d{4}$/),
  body('transaction_id').notEmpty().withMessage('Transaction ID is required').isString(),
  body('notes').optional().isString()
]

