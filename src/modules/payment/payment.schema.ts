import { body, param, query } from 'express-validator'

export const createPaymentSchema = [
  body('contract_id').notEmpty().withMessage('Contract ID is required').isUUID(),
  body('method')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['COD', 'paypal', 'bank_transfer', 'visa'])
    .withMessage('Payment method must be COD, paypal, bank_transfer, or visa'),
  body('due_date').notEmpty().withMessage('Due date is required').isISO8601(),
  body('payment_items')
    .isArray({ min: 1 })
    .withMessage('At least one payment item is required'),
  body('payment_items.*.package_id').isUUID(),
  body('payment_items.*.contract_service_id').optional().isUUID(),
  body('payment_items.*.item_name').notEmpty().isString(),
  body('payment_items.*.quantity').isInt({ min: 1 }),
  body('payment_items.*.unit_price').isFloat({ min: 0 }),
  body('payment_items.*.total_price').isFloat({ min: 0 }),
  body('payment_items.*.period_start').isISO8601(),
  body('payment_items.*.period_end').isISO8601(),
  body('payment_items.*.notes').optional().isString(),
  body('notes').optional().isString()
]

export const paymentIdSchema = [param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID')]

export const getPaymentsSchema = [
  query('contract_id').optional().isUUID(),
  query('family_user_id').optional().isUUID(),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'overdue'])
    .withMessage('Invalid payment status'),
  query('method')
    .optional()
    .isIn(['COD', 'paypal', 'bank_transfer', 'visa'])
    .withMessage('Invalid payment method'),
  query('take').optional().isInt({ min: 1 }).withMessage('take must be a positive integer'),
  query('skip').optional().isInt({ min: 0 }).withMessage('skip must be a non-negative integer')
]

export const initiatePayPalPaymentSchema = [
  param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID'),
  body('return_url').notEmpty().isURL().withMessage('Return URL is required and must be a valid URL'),
  body('cancel_url').notEmpty().isURL().withMessage('Cancel URL is required and must be a valid URL')
]

export const confirmPayPalPaymentSchema = [
  param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID'),
  body('order_id').notEmpty().isString().withMessage('PayPal order ID is required')
]

export const processCODPaymentSchema = [param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID')]

export const processBankTransferSchema = [
  param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID'),
  body('bank_name').notEmpty().isString().withMessage('Bank name is required'),
  body('account_number').notEmpty().isString().withMessage('Account number is required'),
  body('account_holder').notEmpty().isString().withMessage('Account holder name is required'),
  body('transfer_reference').optional().isString()
]

export const processVisaPaymentSchema = [
  param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID'),
  body('card_number')
    .notEmpty()
    .matches(/^\d{13,19}$/)
    .withMessage('Card number must be 13-19 digits'),
  body('card_holder').notEmpty().isString().withMessage('Card holder name is required'),
  body('expiry_date')
    .notEmpty()
    .matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
    .withMessage('Expiry date must be in MM/YY format'),
  body('cvv').notEmpty().matches(/^\d{3,4}$/).withMessage('CVV must be 3-4 digits')
]

export const updatePaymentStatusSchema = [
  param('payment_id').isUUID().withMessage('Payment ID must be a valid UUID'),
  body('status')
    .notEmpty()
    .isIn(['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'overdue'])
    .withMessage('Invalid payment status'),
  body('payment_reference').optional().isString(),
  body('failure_reason').optional().isString(),
  body('metadata').optional().isObject(),
  body('paid_at').optional().isISO8601()
]

export const calculatePaymentAmountSchema = [
  param('contract_id').isUUID().withMessage('Contract ID must be a valid UUID'),
  query('period_start').notEmpty().isISO8601().withMessage('Period start date is required'),
  query('period_end').notEmpty().isISO8601().withMessage('Period end date is required')
]

