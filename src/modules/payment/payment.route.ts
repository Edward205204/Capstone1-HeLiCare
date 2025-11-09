import { Router } from 'express'
import { paymentController } from './payment.controller'
import { accessTokenValidator } from '../auth/auth.middleware'
import {
  createPaymentValidator,
  getPaymentsValidator,
  getPaymentByIdValidator,
  initiateMomoPaymentValidator,
  confirmCODPaymentValidator,
  updatePaymentStatusValidator,
  getPaymentsByContractValidator,
  generatePaymentScheduleValidator,
  isFamily,
  isAdminOrStaff
} from './payment.middleware'
import { wrapRequestHandler } from '~/utils/handler'

const paymentRouter = Router()

// Create Payment (Family only)
paymentRouter.post(
  '/payments',
  accessTokenValidator,
  isFamily,
  createPaymentValidator,
  wrapRequestHandler(paymentController.createPayment)
)

// Get Payments (Family can see their own, Admin/Staff can see all in institution)
paymentRouter.get(
  '/payments',
  accessTokenValidator,
  getPaymentsValidator,
  wrapRequestHandler(paymentController.getPayments)
)

// Get Payment By ID
paymentRouter.get(
  '/payments/:payment_id',
  accessTokenValidator,
  getPaymentByIdValidator,
  wrapRequestHandler(paymentController.getPaymentById)
)

// Initiate Momo Payment
paymentRouter.post(
  '/payments/:payment_id/momo/initiate',
  accessTokenValidator,
  isFamily,
  initiateMomoPaymentValidator,
  wrapRequestHandler(paymentController.initiateMomoPayment)
)

// Momo Payment Callback (no auth required - called by Momo)
paymentRouter.get(
  '/payments/momo/callback',
  wrapRequestHandler(paymentController.handleMomoCallback)
)

// Momo Payment Callback POST (no auth required - called by Momo)
paymentRouter.post(
  '/payments/momo/callback',
  wrapRequestHandler(paymentController.handleMomoCallback)
)

// Confirm COD Payment (Admin/Staff only)
paymentRouter.post(
  '/payments/:payment_id/cod/confirm',
  accessTokenValidator,
  isAdminOrStaff,
  confirmCODPaymentValidator,
  wrapRequestHandler(paymentController.confirmCODPayment)
)

// Update Payment Status (Admin/Staff only)
paymentRouter.patch(
  '/payments/:payment_id/status',
  accessTokenValidator,
  isAdminOrStaff,
  updatePaymentStatusValidator,
  wrapRequestHandler(paymentController.updatePaymentStatus)
)

// Get Payments By Contract
paymentRouter.get(
  '/contracts/:contract_id/payments',
  accessTokenValidator,
  getPaymentsByContractValidator,
  wrapRequestHandler(paymentController.getPaymentsByContract)
)

// Generate Payment Schedule
paymentRouter.get(
  '/contracts/:contract_id/payment-schedule',
  accessTokenValidator,
  generatePaymentScheduleValidator,
  wrapRequestHandler(paymentController.generatePaymentSchedule)
)

export default paymentRouter

