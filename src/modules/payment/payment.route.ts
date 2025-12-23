import { Router } from 'express'
import { paymentController } from './payment.controller'
import { dbmAccountController } from './dbm-account.controller'
import {
  isHandleByAdminOrStaff,
  isHandleByFamily,
  createPaymentValidator,
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

// ========== MOCK ACCOUNT ENDPOINTS (DBM) ==========

// Lấy thông tin tài khoản của user hiện tại (Family/Resident)
paymentRouter.get('/dbm/account', accessTokenValidator, wrapRequestHandler(dbmAccountController.getMyAccount))

// Lấy lịch sử giao dịch của user hiện tại (Family/Resident)
paymentRouter.get(
  '/dbm/transactions',
  accessTokenValidator,
  wrapRequestHandler(dbmAccountController.getMyTransactionHistory)
)

// Lấy thống kê thanh toán cho viện (Admin/Staff)
paymentRouter.get(
  '/dbm/statistics',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  wrapRequestHandler(dbmAccountController.getPaymentStatistics)
)

// Lấy revenue analytics theo thời gian (để làm chart)
paymentRouter.get(
  '/dbm/revenue/analytics',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  wrapRequestHandler(dbmAccountController.getRevenueAnalytics)
)

// Lấy revenue theo phương thức thanh toán
paymentRouter.get(
  '/dbm/revenue/by-method',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  wrapRequestHandler(dbmAccountController.getRevenueByPaymentMethod)
)

export default paymentRouter
