import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  createVNPayPaymentUrl,
  verifyVNPaySecureHash,
  parseVNPayCallback,
  isVNPaySuccess,
  getVNPayResponseMessage
} from './vnpay.utils'
import { CreateVNPayPaymentReqBody, VNPayPaymentUrlResponse } from '../payment.dto'
import { serviceContractService } from '../../service-contract/service-contract.service'

class VNPayService {
  /**
   * Tạo payment URL từ VNPay
   * @param payer_id - ID của người thanh toán
   * @param data - Thông tin payment
   * @returns Payment URL và payment ID
   */
  createPaymentUrl = async (payer_id: string, data: CreateVNPayPaymentReqBody): Promise<VNPayPaymentUrlResponse> => {
    const { contract_id, period_start, period_end } = data

    // Validate contract tồn tại và active
    const contract = await prisma.serviceContract.findFirst({
      where: {
        contract_id,
        is_active: true
      },
      include: {
        resident: {
          select: {
            full_name: true
          }
        }
      }
    })

    if (!contract) {
      throw new ErrorWithStatus({
        message: 'Service contract not found or inactive',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Validate payer có quyền truy cập contract này không (qua resident link)
    if (payer_id) {
      const link = await prisma.familyResidentLink.findFirst({
        where: {
          family_user_id: payer_id,
          resident_id: contract.resident_id,
          status: 'active'
        }
      })

      if (!link) {
        throw new ErrorWithStatus({
          message: 'You do not have permission to pay for this contract',
          status: HTTP_STATUS.FORBIDDEN
        })
      }
    }

    // Validate period dates
    const periodStart = new Date(period_start)
    const periodEnd = new Date(period_end)

    if (periodEnd <= periodStart) {
      throw new ErrorWithStatus({
        message: 'Period end date must be after period start date',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Validate amount
    if (contract.amount <= 0) {
      throw new ErrorWithStatus({
        message: 'Contract amount must be greater than 0',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Tạo payment record với status PENDING
    const payment = await prisma.payment.create({
      data: {
        contract_id,
        payer_id,
        amount: contract.amount,
        payment_method: 'VNPAY',
        status: 'PENDING',
        period_start: periodStart,
        period_end: periodEnd,
        vnpay_order_id: `HELICARE_${Date.now()}_${contract_id.substring(0, 8)}` // Unique order ID
      }
    })

    // Tạo order info cho VNPay
    const orderInfo = `Thanh toan hop dong ${contract.resident.full_name} - Ky ${periodStart.toLocaleDateString('vi-VN')} den ${periodEnd.toLocaleDateString('vi-VN')}`

    // Tạo payment URL
    const paymentUrl = createVNPayPaymentUrl(orderInfo, contract.amount, payment.vnpay_order_id!)

    return {
      payment_url: paymentUrl,
      payment_id: payment.payment_id,
      order_id: payment.vnpay_order_id!
    }
  }

  /**
   * Xử lý callback từ VNPay
   * @param queryParams - Query params từ VNPay callback
   * @returns Payment record đã được cập nhật
   */
  handleCallback = async (queryParams: Record<string, any>) => {
    // Verify secure hash
    if (!verifyVNPaySecureHash(queryParams, queryParams.vnp_SecureHash)) {
      throw new ErrorWithStatus({
        message: 'Invalid secure hash from VNPay',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Parse callback params
    const callbackData = parseVNPayCallback(queryParams)

    // Tìm payment theo order ID
    const payment = await prisma.payment.findFirst({
      where: {
        vnpay_order_id: callbackData.txnRef
      },
      include: {
        contract: true
      }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Kiểm tra xem payment đã được xử lý chưa
    if (payment.status === 'SUCCESS') {
      // Payment đã được xử lý, chỉ cần return
      return payment
    }

    // Cập nhật payment status
    const isSuccess = isVNPaySuccess(callbackData.responseCode)

    // Transaction để đảm bảo tính nhất quán
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // Cập nhật payment
      const updated = await tx.payment.update({
        where: { payment_id: payment.payment_id },
        data: {
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          vnpay_transaction_no: callbackData.transactionNo,
          vnpay_response_code: callbackData.responseCode,
          vnpay_bank_code: callbackData.bankCode,
          transaction_ref: callbackData.bankTranNo || callbackData.transactionNo
        },
        include: {
          contract: true,
          payer: {
            include: {
              familyProfile: true
            }
          }
        }
      })

      // Nếu thanh toán thành công, cập nhật next_billing_date của contract
      if (isSuccess) {
        const nextBillingDate = serviceContractService.calculateNextBillingDate(
          new Date(payment.period_end),
          updated.contract.billing_cycle
        )

        await tx.serviceContract.update({
          where: { contract_id: payment.contract_id },
          data: {
            next_billing_date: nextBillingDate
          }
        })
      }

      return updated
    })

    return updatedPayment
  }

  /**
   * Xử lý IPN (Instant Payment Notification) từ VNPay
   * IPN được gọi tự động bởi VNPay server để thông báo về trạng thái thanh toán
   * @param queryParams - Query params từ VNPay IPN
   * @returns Payment record đã được cập nhật
   */
  handleIPN = async (queryParams: Record<string, any>) => {
    // Verify secure hash
    if (!verifyVNPaySecureHash(queryParams, queryParams.vnp_SecureHash)) {
      throw new ErrorWithStatus({
        message: 'Invalid secure hash from VNPay IPN',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Parse IPN params (tương tự callback)
    const ipnData = parseVNPayCallback(queryParams)

    // Tìm payment theo order ID
    const payment = await prisma.payment.findFirst({
      where: {
        vnpay_order_id: ipnData.txnRef
      },
      include: {
        contract: true
      }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Kiểm tra xem payment đã được xử lý chưa
    if (payment.status === 'SUCCESS') {
      return payment
    }

    // Cập nhật payment status
    const isSuccess = isVNPaySuccess(ipnData.responseCode)

    // Transaction để đảm bảo tính nhất quán
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // Cập nhật payment
      const updated = await tx.payment.update({
        where: { payment_id: payment.payment_id },
        data: {
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          vnpay_transaction_no: ipnData.transactionNo,
          vnpay_response_code: ipnData.responseCode,
          vnpay_bank_code: ipnData.bankCode,
          transaction_ref: ipnData.bankTranNo || ipnData.transactionNo
        },
        include: {
          contract: true
        }
      })

      // Nếu thanh toán thành công, cập nhật next_billing_date của contract
      if (isSuccess) {
        const nextBillingDate = serviceContractService.calculateNextBillingDate(
          new Date(payment.period_end),
          updated.contract.billing_cycle
        )

        await tx.serviceContract.update({
          where: { contract_id: payment.contract_id },
          data: {
            next_billing_date: nextBillingDate
          }
        })
      }

      return updated
    })

    return updatedPayment
  }

  /**
   * Lấy thông điệp từ response code
   */
  getResponseMessage = (responseCode: string): string => {
    return getVNPayResponseMessage(responseCode)
  }
}

export const vnpayService = new VNPayService()
