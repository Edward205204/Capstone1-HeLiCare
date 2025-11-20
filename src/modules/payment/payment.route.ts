import { Router } from 'express'
import { paymentController } from './payment.controller'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidator } from '~/modules/auth/auth.middleware'
import {
  createPaymentSchema,
  generatePaymentsSchema,
  paymentIdSchema,
  initiatePayPalPaymentSchema,
  capturePayPalPaymentSchema,
  getPaymentsSchema,
  updatePaymentStatusSchema,
  processCODPaymentSchema,
  processBankTransferSchema,
  processVisaPaymentSchema
} from './payment.schema'
import {
  paymentIdValidator,
  isPaymentBelongsToInstitution,
  canAccessPayment,
  isAdminOrStaff,
  isAdminOnly,
  isFamilyOrAdmin,
  validateRequest
} from './payment.middleware'

const paymentRouter = Router()

// GET Routes - Lấy danh sách payments
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

// POST Routes - Tạo payment
paymentRouter.post(
  '/',
  accessTokenValidator,
  isFamilyOrAdmin,
  createPaymentSchema,
  validateRequest,
  wrapRequestHandler(paymentController.createPayment)
)

// Generate payments from contract (Admin/Staff only)
paymentRouter.post(
  '/contract/:contract_id/generate',
  accessTokenValidator,
  isAdminOrStaff,
  generatePaymentsSchema,
  validateRequest,
  wrapRequestHandler(paymentController.generatePaymentsFromContract)
)

// PayPal payment flow
paymentRouter.post(
  '/:payment_id/paypal/initiate',
  accessTokenValidator,
  isFamilyOrAdmin,
  initiatePayPalPaymentSchema,
  validateRequest,
  paymentIdValidator,
  canAccessPayment,
  wrapRequestHandler(paymentController.initiatePayPalPayment)
)

paymentRouter.post(
  '/:payment_id/paypal/capture',
  accessTokenValidator,
  isFamilyOrAdmin,
  capturePayPalPaymentSchema,
  validateRequest,
  paymentIdValidator,
  canAccessPayment,
  wrapRequestHandler(paymentController.capturePayPalPayment)
)

// COD payment flow
paymentRouter.post(
  '/:payment_id/cod/process',
  accessTokenValidator,
  isFamilyOrAdmin,
  processCODPaymentSchema,
  validateRequest,
  paymentIdValidator,
  canAccessPayment,
  wrapRequestHandler(paymentController.processCODPayment)
)

paymentRouter.post(
  '/:payment_id/cod/mark-paid',
  accessTokenValidator,
  isAdminOrStaff,
  paymentIdSchema,
  validateRequest,
  paymentIdValidator,
  isPaymentBelongsToInstitution,
  wrapRequestHandler(paymentController.markCODPaymentAsPaid)
)

// Bank transfer payment flow
paymentRouter.post(
  '/:payment_id/bank-transfer/process',
  accessTokenValidator,
  isFamilyOrAdmin,
  processBankTransferSchema,
  validateRequest,
  paymentIdValidator,
  canAccessPayment,
  wrapRequestHandler(paymentController.processBankTransfer)
)

paymentRouter.post(
  '/:payment_id/bank-transfer/mark-paid',
  accessTokenValidator,
  isAdminOrStaff,
  paymentIdSchema,
  validateRequest,
  paymentIdValidator,
  isPaymentBelongsToInstitution,
  wrapRequestHandler(paymentController.markBankTransferAsPaid)
)

// Visa payment flow
paymentRouter.post(
  '/:payment_id/visa/process',
  accessTokenValidator,
  isFamilyOrAdmin,
  processVisaPaymentSchema,
  validateRequest,
  paymentIdValidator,
  canAccessPayment,
  wrapRequestHandler(paymentController.processVisaPayment)
)

paymentRouter.post(
  '/:payment_id/visa/mark-paid',
  accessTokenValidator,
  isAdminOrStaff,
  paymentIdSchema,
  validateRequest,
  paymentIdValidator,
  isPaymentBelongsToInstitution,
  wrapRequestHandler(paymentController.markVisaPaymentAsPaid)
)

// PUT Routes - Cập nhật payment status (Admin only)
paymentRouter.put(
  '/:payment_id/status',
  accessTokenValidator,
  isAdminOnly,
  updatePaymentStatusSchema,
  validateRequest,
  paymentIdValidator,
  isPaymentBelongsToInstitution,
  wrapRequestHandler(paymentController.updatePaymentStatus)
)

export default paymentRouter

