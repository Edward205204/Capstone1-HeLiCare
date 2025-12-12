import { Router } from 'express'
import { paymentController } from './payment.controller'
import {
  isHandleByAdminOrStaff,
  isHandleByFamily,
  createPaymentValidator,
  updatePaymentValidator,
  uploadProofValidator,
  paymentIdParamValidator,
  createVNPayPaymentValidator
} from './payment.middleware'
import { accessTokenValidator } from '../auth/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'

const paymentRouter = Router()

// ========== PAYMENT ROUTES ==========

// Tạo payment (Family)
paymentRouter.post(
  '/',
  accessTokenValidator,
  isHandleByFamily,
  createPaymentValidator,
  wrapRequestHandler(paymentController.createPayment)
)

// Lấy danh sách payments (Admin/Staff)
paymentRouter.get('/', accessTokenValidator, isHandleByAdminOrStaff, wrapRequestHandler(paymentController.getPayments))

// Lấy payments của Family user
paymentRouter.get(
  '/family',
  accessTokenValidator,
  isHandleByFamily,
  wrapRequestHandler(paymentController.getPaymentsByFamily)
)

// Lấy payment theo ID
paymentRouter.get(
  '/:id',
  accessTokenValidator,
  paymentIdParamValidator,
  wrapRequestHandler(paymentController.getPaymentById)
)

// Upload proof image (Family)
paymentRouter.post(
  '/:id/upload-proof',
  accessTokenValidator,
  isHandleByFamily,
  paymentIdParamValidator,
  uploadProofValidator,
  wrapRequestHandler(paymentController.uploadProof)
)

// Admin verify payment (Admin/Staff)
paymentRouter.post(
  '/:id/verify',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  paymentIdParamValidator,
  wrapRequestHandler(paymentController.verifyPayment)
)

// Cancel payment (Family)
paymentRouter.post(
  '/:id/cancel',
  accessTokenValidator,
  isHandleByFamily,
  paymentIdParamValidator,
  wrapRequestHandler(paymentController.cancelPayment)
)

// ========== VNPAY ROUTES ==========

// Tạo VNPay payment URL
paymentRouter.post(
  '/vnpay/create',
  accessTokenValidator,
  isHandleByFamily,
  createVNPayPaymentValidator,
  wrapRequestHandler(paymentController.createVNPayPayment)
)

// VNPay callback (public - không cần auth vì VNPay gọi trực tiếp)
paymentRouter.get('/vnpay/callback', wrapRequestHandler(paymentController.handleVNPayCallback))

// VNPay IPN (public - không cần auth vì VNPay gọi trực tiếp)
paymentRouter.post('/vnpay/ipn', wrapRequestHandler(paymentController.handleVNPayIPN))

export default paymentRouter
