import { Request, Response } from 'express'
import { paymentService } from './payment.service'
import { vnpayService } from './vnpay/vnpay.service'
import { HTTP_STATUS } from '~/constants/http_status'
import { prisma } from '~/utils/db'
import {
  CreatePaymentReqBody,
  UploadProofReqBody,
  GetPaymentsQuery,
  CreateVNPayPaymentReqBody,
  VNPayCallbackQuery
} from './payment.dto'

class PaymentController {
  // Tạo payment (Family)
  createPayment = async (req: Request, res: Response) => {
    try {
      const payer_id = req.decoded_authorization?.user_id as string
      const data = req.body as CreatePaymentReqBody

      if (!payer_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'User ID not found'
        })
        return
      }

      const payment = await paymentService.createPayment(payer_id, data)

      res.status(HTTP_STATUS.CREATED).json({
        message: 'Payment created successfully',
        data: payment
      })
    } catch (error: any) {
      console.error('Error in createPayment:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to create payment'
      })
    }
  }

  // Lấy danh sách payments (Admin/Staff)
  getPayments = async (req: Request, res: Response) => {
    try {
      const institution_id = req.decoded_authorization?.institution_id as string
      const query = req.query as unknown as GetPaymentsQuery

      if (!institution_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'Institution ID not found'
        })
        return
      }

      // Lấy danh sách contract IDs của institution để filter payments
      const contracts = await prisma.serviceContract.findMany({
        where: { institution_id },
        select: { contract_id: true }
      })

      const contractIds = contracts.map((c) => c.contract_id)

      const params: GetPaymentsQuery = {
        ...query
      }

      // Nếu không có contract_id trong query, filter theo institution
      if (!params.contract_id && contractIds.length > 0) {
        // Lấy payments của contracts trong institution
        const payments = await paymentService.getPayments(params)
        const filteredPayments = payments.payments.filter((p) => contractIds.includes(p.contract_id))

        res.status(HTTP_STATUS.OK).json({
          message: 'Payments retrieved successfully',
          payments: filteredPayments,
          pagination: payments.pagination
        })
        return
      }

      const result = await paymentService.getPayments(params)

      res.status(HTTP_STATUS.OK).json({
        message: 'Payments retrieved successfully',
        ...result
      })
    } catch (error: any) {
      console.error('Error in getPayments:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve payments'
      })
    }
  }

  // Lấy payments của Family user
  getPaymentsByFamily = async (req: Request, res: Response) => {
    try {
      const family_user_id = req.decoded_authorization?.user_id as string
      const query = req.query as unknown as GetPaymentsQuery

      if (!family_user_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'User ID not found'
        })
        return
      }

      const payments = await paymentService.getPaymentsByFamily(family_user_id, query)

      res.status(HTTP_STATUS.OK).json({
        message: 'Payments retrieved successfully',
        data: payments
      })
    } catch (error: any) {
      console.error('Error in getPaymentsByFamily:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve payments'
      })
    }
  }

  // Lấy payment theo ID
  getPaymentById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const payment = await paymentService.getPaymentById(id)

      res.status(HTTP_STATUS.OK).json({
        message: 'Payment retrieved successfully',
        data: payment
      })
    } catch (error: any) {
      console.error('Error in getPaymentById:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve payment'
      })
    }
  }

  // Upload proof image (Family)
  uploadProof = async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const payer_id = req.decoded_authorization?.user_id as string
      const data = req.body as UploadProofReqBody

      if (!payer_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'User ID not found'
        })
        return
      }

      const payment = await paymentService.uploadProof(id, payer_id, data)

      res.status(HTTP_STATUS.OK).json({
        message: 'Proof image uploaded successfully',
        data: payment
      })
    } catch (error: any) {
      console.error('Error in uploadProof:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to upload proof image'
      })
    }
  }

  // Admin verify payment (Admin/Staff)
  verifyPayment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const verified_by_id = req.decoded_authorization?.user_id as string
      const institution_id = req.decoded_authorization?.institution_id as string

      if (!verified_by_id || !institution_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'User ID or Institution ID not found'
        })
        return
      }

      const payment = await paymentService.verifyPayment(id, verified_by_id, institution_id)

      res.status(HTTP_STATUS.OK).json({
        message: 'Payment verified successfully',
        data: payment
      })
    } catch (error: any) {
      console.error('Error in verifyPayment:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to verify payment'
      })
    }
  }

  // Cancel payment (Family)
  cancelPayment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const payer_id = req.decoded_authorization?.user_id as string

      if (!payer_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'User ID not found'
        })
        return
      }

      await paymentService.cancelPayment(id, payer_id)

      res.status(HTTP_STATUS.OK).json({
        message: 'Payment cancelled successfully'
      })
    } catch (error: any) {
      console.error('Error in cancelPayment:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to cancel payment'
      })
    }
  }

  // ========== VNPAY ENDPOINTS ==========

  // Tạo VNPay payment URL (hoặc mock payment nếu ở mock mode)
  createVNPayPayment = async (req: Request, res: Response) => {
    try {
      const payer_id = req.decoded_authorization?.user_id as string
      const data = req.body as CreateVNPayPaymentReqBody

      if (!payer_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'User ID not found'
        })
        return
      }

      const queryMock = req.query.mock
      const useMock = queryMock === 'true' || queryMock === 'true'

      if (useMock) {
        const result = await vnpayService.mockPayment(payer_id, data)

        res.status(HTTP_STATUS.OK).json({
          message: result.status === 'SUCCESS' ? 'Thanh toán thành công' : result.message,
          data: {
            payment_id: result.payment_id,
            status: result.status,
            vnpay_order_id: result.vnpay_order_id,
            vnpay_transaction_no: result.vnpay_transaction_no
          }
        })
        return
      }

      console.log('⚠️ Using REAL VNPay mode - Will redirect to VNPay sandbox')

      // Nếu không phải mock mode, tạo VNPay URL như bình thường
      const result = await vnpayService.createPaymentUrl(payer_id, data)

      res.status(HTTP_STATUS.OK).json({
        message: 'VNPay payment URL created successfully',
        data: result
      })
    } catch (error: any) {
      console.error('Error in createVNPayPayment:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to create VNPay payment URL'
      })
    }
  }

  // VNPay callback handler
  handleVNPayCallback = async (req: Request, res: Response) => {
    try {
      console.log('VNPay Callback - Query params:', JSON.stringify(req.query, null, 2))
      const queryParams = req.query as unknown as VNPayCallbackQuery

      const payment = await vnpayService.handleCallback(queryParams)

      // Redirect về frontend với kết quả
      const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3001'
      const success = payment.status === 'SUCCESS'

      console.log(`Payment ${payment.payment_id} processed. Status: ${payment.status}, Success: ${success}`)

      if (success) {
        const redirectUrl = `${frontendUrl}/payment/result?payment_id=${payment.payment_id}&status=success`
        console.log(`Redirecting to success URL: ${redirectUrl}`)
        res.redirect(redirectUrl)
      } else {
        // Nếu thất bại, lấy thông báo lỗi từ VNPay response code
        const errorMessage = payment.vnpay_response_code
          ? vnpayService.getResponseMessage(payment.vnpay_response_code)
          : 'Thanh toán thất bại'
        const redirectUrl = `${frontendUrl}/payment/result?payment_id=${payment.payment_id}&status=failed&error=${encodeURIComponent(errorMessage)}`
        console.log(`Redirecting to failed URL: ${redirectUrl}`)
        res.redirect(redirectUrl)
      }
    } catch (error: any) {
      console.error('Error in handleVNPayCallback:', error)
      console.error('Error stack:', error.stack)
      const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3001'
      const redirectUrl = `${frontendUrl}/payment/result?error=${encodeURIComponent(error.message || 'Payment processing failed')}`
      console.log(`Redirecting to error URL: ${redirectUrl}`)
      res.redirect(redirectUrl)
    }
  }

  // VNPay IPN handler
  handleVNPayIPN = async (req: Request, res: Response) => {
    try {
      console.log('VNPay IPN received:', JSON.stringify(req.query, null, 2))
      const queryParams = req.query as unknown as VNPayCallbackQuery

      await vnpayService.handleIPN(queryParams)

      // VNPay yêu cầu trả về response code
      res.status(HTTP_STATUS.OK).json({
        RspCode: '00',
        Message: 'Success'
      })
    } catch (error: any) {
      console.error('Error in handleVNPayIPN:', error)
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        RspCode: '99',
        Message: error.message || 'Failed to process IPN'
      })
    }
  }
}

export const paymentController = new PaymentController()
