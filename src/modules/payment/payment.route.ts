import { Router } from 'express'
import { paymentController } from './payment.controller'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidator } from '~/modules/auth/auth.middleware'
import {
  createPaymentSchema,
  paymentIdSchema,
  getPaymentsSchema,
  initiatePayPalPaymentSchema,
  confirmPayPalPaymentSchema,
  processCODPaymentSchema,
  processBankTransferSchema,
  processVisaPaymentSchema,
  updatePaymentStatusSchema,
  calculatePaymentAmountSchema
} from './payment.schema'
import {
  paymentIdValidator,
  isPaymentBelongsToInstitution,
  canAccessPayment,
  isAdminOrStaff,
  isAdminOnly,
  isFamilyOnly,
  validateRequest
} from './payment.middleware'

const paymentRouter = Router()

// GET Routes
paymentRouter.get(
  '/',
  accessTokenValidator,
  getPaymentsSchema,
  validateRequest,
  wrapRequestHandler(paymentController.getPayments)
)

paymentRouter.get(
  '/:payment_id',
  accessTokenValidator,
  paymentIdSchema,
  validateRequest,
  paymentIdValidator,
  canAccessPayment,
  wrapRequestHandler(paymentController.getPaymentById)
)

paymentRouter.get(
  '/contract/:contract_id/calculate',
  accessTokenValidator,
  calculatePaymentAmountSchema,
  validateRequest,
  wrapRequestHandler(paymentController.calculatePaymentAmount)
)

// POST Routes
paymentRouter.post(
  '/',
  accessTokenValidator,
  isFamilyOnly,
  createPaymentSchema,
  validateRequest,
  wrapRequestHandler(paymentController.createPayment)
)

paymentRouter.post(
  '/:payment_id/paypal/initiate',
  accessTokenValidator,
  isFamilyOnly,
  initiatePayPalPaymentSchema,
  validateRequest,
  paymentIdValidator,
  canAccessPayment,
  wrapRequestHandler(paymentController.initiatePayPalPayment)
)

paymentRouter.post(
  '/:payment_id/paypal/confirm',
  accessTokenValidator,
  isFamilyOnly,
  confirmPayPalPaymentSchema,
  validateRequest,
  paymentIdValidator,
  canAccessPayment,
  wrapRequestHandler(paymentController.confirmPayPalPayment)
)

paymentRouter.post(
  '/:payment_id/cod',
  accessTokenValidator,
  isFamilyOnly,
  processCODPaymentSchema,
  validateRequest,
  paymentIdValidator,
  canAccessPayment,
  wrapRequestHandler(paymentController.processCODPayment)
)

paymentRouter.post(
  '/:payment_id/bank-transfer',
  accessTokenValidator,
  isFamilyOnly,
  processBankTransferSchema,
  validateRequest,
  paymentIdValidator,
  canAccessPayment,
  wrapRequestHandler(paymentController.processBankTransfer)
)

paymentRouter.post(
  '/:payment_id/visa',
  accessTokenValidator,
  isFamilyOnly,
  processVisaPaymentSchema,
  validateRequest,
  paymentIdValidator,
  canAccessPayment,
  wrapRequestHandler(paymentController.processVisaPayment)
)

// PUT Routes
paymentRouter.put(
  '/:payment_id/status',
  accessTokenValidator,
  isAdminOrStaff,
  updatePaymentStatusSchema,
  validateRequest,
  paymentIdValidator,
  isPaymentBelongsToInstitution,
  wrapRequestHandler(paymentController.updatePaymentStatus)
)

paymentRouter.put(
  '/:payment_id/cod/confirm',
  accessTokenValidator,
  isAdminOrStaff,
  processCODPaymentSchema,
  validateRequest,
  paymentIdValidator,
  isPaymentBelongsToInstitution,
  wrapRequestHandler(paymentController.confirmCODPayment)
)

paymentRouter.put(
  '/:payment_id/bank-transfer/confirm',
  accessTokenValidator,
  isAdminOrStaff,
  processCODPaymentSchema,
  validateRequest,
  paymentIdValidator,
  isPaymentBelongsToInstitution,
  wrapRequestHandler(paymentController.confirmBankTransfer)
)

paymentRouter.put(
  '/:payment_id/cancel',
  accessTokenValidator,
  paymentIdSchema,
  validateRequest,
  paymentIdValidator,
  canAccessPayment,
  wrapRequestHandler(paymentController.cancelPayment)
)

// Webhook Routes (no authentication - PayPal will call this)
paymentRouter.post('/webhook/paypal', wrapRequestHandler(paymentController.processPayPalWebhook))

export default paymentRouter

