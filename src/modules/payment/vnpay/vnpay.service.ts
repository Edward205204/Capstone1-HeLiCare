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
import { dbmAccountService } from '../dbm-account.service'

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

    // Kiểm tra số dư tài khoản mock trước khi tạo payment URL
    if (payer_id) {
      const hasBalance = await dbmAccountService.checkBalance(payer_id, contract.amount)
      if (!hasBalance) {
        throw new ErrorWithStatus({
          message: 'Số dư tài khoản không đủ để thực hiện giao dịch',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    // Tạo order ID ngắn gọn hơn (VNPay giới hạn 100 ký tự)
    // Format: HELICARE_TIMESTAMP_8CHARS
    const timestamp = Date.now()
    const shortContractId = contract_id.substring(0, 8).replace(/-/g, '')
    const vnpayOrderId = `HELICARE_${timestamp}_${shortContractId}`

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
        vnpay_order_id: vnpayOrderId
      }
    })

    // Tạo order info cho VNPay (giới hạn 255 ký tự, loại bỏ ký tự đặc biệt)
    // VNPay yêu cầu vnp_OrderInfo không có ký tự đặc biệt, chỉ chấp nhận a-z, A-Z, 0-9, và một số ký tự cơ bản
    const periodStartStr = periodStart
      .toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      .replace(/\//g, '-')
    const periodEndStr = periodEnd
      .toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      .replace(/\//g, '-')

    // Loại bỏ dấu tiếng Việt và ký tự đặc biệt từ tên
    const removeVietnameseAccents = (str: string): string => {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Chỉ giữ chữ, số, khoảng trắng và dấu gạch ngang
        .trim()
    }

    const residentName = removeVietnameseAccents(contract.resident.full_name).substring(0, 50)
    const orderInfo = `Thanh toan hop dong ${residentName} - Ky ${periodStartStr} den ${periodEndStr}`

    // Tạo payment URL
    const paymentUrl = createVNPayPaymentUrl(orderInfo, contract.amount, payment.vnpay_order_id!)

    return {
      payment_url: paymentUrl,
      payment_id: payment.payment_id,
      order_id: payment.vnpay_order_id!
    }
  }

  /**
   * Mock thanh toán VNPay (xử lý ngay trong hệ thống, không redirect đến VNPay)
   * @param payer_id - ID của người thanh toán
   * @param data - Thông tin payment
   * @returns Payment result
   */
  mockPayment = async (payer_id: string, data: CreateVNPayPaymentReqBody) => {
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
            resident_id: true,
            full_name: true
          }
        },
        institution: {
          select: {
            institution_id: true,
            name: true
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

    // Validate payer có quyền truy cập contract này không
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

    // Kiểm tra số dư tài khoản mock
    if (payer_id) {
      const hasBalance = await dbmAccountService.checkBalance(payer_id, contract.amount)
      if (!hasBalance) {
        throw new ErrorWithStatus({
          message: 'Số dư tài khoản không đủ để thực hiện giao dịch',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    // Tạo order ID
    const timestamp = Date.now()
    const shortContractId = contract_id.substring(0, 8).replace(/-/g, '')
    const vnpayOrderId = `HELICARE_${timestamp}_${shortContractId}`

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
        vnpay_order_id: vnpayOrderId
      },
      include: {
        contract: {
          include: {
            resident: true,
            institution: true
          }
        },
        payer: {
          include: {
            familyProfile: true,
            resident: true
          }
        }
      }
    })

    // Xử lý thanh toán ngay (mock)
    let transactionHistory = null
    let accountId = null
    let paymentStatus: 'SUCCESS' | 'FAILED' = 'SUCCESS'
    let errorMessage: string | null = null

    try {
      // Kiểm tra số dư lại một lần nữa
      if (payer_id) {
        const hasBalance = await dbmAccountService.checkBalance(payer_id, contract.amount)
        if (!hasBalance) {
          paymentStatus = 'FAILED'
          errorMessage = 'Số dư tài khoản không đủ để thực hiện giao dịch'
        } else {
          // Trừ tiền từ tài khoản mock
          const account = await dbmAccountService.getAccountByUserId(payer_id)
          accountId = account.account_id

          transactionHistory = await dbmAccountService.debitAccount(
            payer_id,
            contract.amount,
            `Thanh toán hợp đồng dịch vụ - ${contract.resident.full_name}`,
            payment.payment_id,
            vnpayOrderId
          )
        }
      }
    } catch (error: any) {
      console.error('Error processing mock payment:', error)
      paymentStatus = 'FAILED'
      errorMessage = error.message || 'Lỗi khi xử lý thanh toán'
    }

    // Cập nhật payment status
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // Cập nhật payment
      const updated = await tx.payment.update({
        where: { payment_id: payment.payment_id },
        data: {
          status: paymentStatus,
          vnpay_transaction_no: `MOCK_${Date.now()}`,
          vnpay_response_code: paymentStatus === 'SUCCESS' ? '00' : '51',
          vnpay_bank_code: 'NCB',
          transaction_ref: `MOCK_${vnpayOrderId}`,
          notes: errorMessage || 'Thanh toán thành công (Mock)'
        },
        include: {
          contract: true
        }
      })

      // Nếu thanh toán thành công, cập nhật next_billing_date của contract
      if (paymentStatus === 'SUCCESS') {
        const nextBillingDate = serviceContractService.calculateNextBillingDate(
          new Date(periodEnd),
          updated.contract.billing_cycle
        )

        await tx.serviceContract.update({
          where: { contract_id: payment.contract_id },
          data: {
            next_billing_date: nextBillingDate
          }
        })
      }

      // Tạo payment log cho viện
      const payerName =
        payment.payer?.familyProfile?.full_name ||
        payment.payer?.resident?.full_name ||
        payment.payer?.email ||
        'Unknown'

      await dbmAccountService.createPaymentLog({
        institution_id: contract.institution_id,
        payment_id: payment.payment_id,
        amount: contract.amount,
        payment_method: 'VNPAY',
        status: paymentStatus,
        payer_id: payer_id || undefined,
        payer_type: payment.payer?.role === 'Family' ? 'family' : 'resident',
        payer_name: payerName,
        resident_id: contract.resident_id,
        resident_name: contract.resident.full_name,
        contract_id: contract.contract_id,
        vnpay_order_id: vnpayOrderId,
        vnpay_transaction_no: `MOCK_${Date.now()}`,
        vnpay_response_code: paymentStatus === 'SUCCESS' ? '00' : '51',
        vnpay_bank_code: 'NCB',
        account_id: accountId || undefined,
        transaction_id: transactionHistory?.transaction_id || undefined,
        period_start: periodStart,
        period_end: periodEnd,
        notes: errorMessage || 'Thanh toán thành công qua Mock VNPay'
      })

      return updated
    })

    return {
      payment_id: updatedPayment.payment_id,
      status: paymentStatus,
      message: paymentStatus === 'SUCCESS' ? 'Thanh toán thành công' : errorMessage || 'Thanh toán thất bại',
      vnpay_order_id: vnpayOrderId,
      vnpay_transaction_no: updatedPayment.vnpay_transaction_no
    }
  }

  /**
   * Xử lý callback từ VNPay
   * @param queryParams - Query params từ VNPay callback
   * @returns Payment record đã được cập nhật
   */
  handleCallback = async (queryParams: Record<string, any>) => {
    console.log('VNPay Callback received:', JSON.stringify(queryParams, null, 2))

    // Verify secure hash
    if (!verifyVNPaySecureHash(queryParams, queryParams.vnp_SecureHash)) {
      console.error('Invalid secure hash from VNPay')
      throw new ErrorWithStatus({
        message: 'Invalid secure hash from VNPay',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Parse callback params
    const callbackData = parseVNPayCallback(queryParams)
    console.log('Parsed callback data:', JSON.stringify(callbackData, null, 2))

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
      console.error(`Payment not found for order ID: ${callbackData.txnRef}`)
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    console.log(
      `Payment found: ${payment.payment_id}, current status: ${payment.status}, response code: ${callbackData.responseCode}`
    )

    // Kiểm tra xem payment đã được xử lý chưa
    if (payment.status === 'SUCCESS') {
      // Payment đã được xử lý, chỉ cần return
      return payment
    }

    // Cập nhật payment status
    const isSuccess = isVNPaySuccess(callbackData.responseCode)

    // Lấy thông tin payer và resident để tạo log
    const paymentWithDetails = await prisma.payment.findUnique({
      where: { payment_id: payment.payment_id },
      include: {
        contract: {
          include: {
            resident: {
              select: {
                resident_id: true,
                full_name: true
              }
            },
            institution: {
              select: {
                institution_id: true,
                name: true
              }
            }
          }
        },
        payer: {
          include: {
            familyProfile: {
              select: {
                full_name: true
              }
            },
            resident: {
              select: {
                full_name: true
              }
            }
          }
        }
      }
    })

    // Transaction để đảm bảo tính nhất quán
    const updatedPayment = await prisma.$transaction(async (tx) => {
      let transactionHistory = null
      let accountId = null

      // Nếu thanh toán thành công và có payer_id, trừ tiền từ tài khoản mock
      if (isSuccess && payment.payer_id) {
        try {
          // Kiểm tra số dư trước khi trừ tiền
          const hasBalance = await dbmAccountService.checkBalance(payment.payer_id, payment.amount)

          if (!hasBalance) {
            // Không đủ tiền, đánh dấu payment là FAILED
            await tx.payment.update({
              where: { payment_id: payment.payment_id },
              data: {
                status: 'FAILED',
                vnpay_transaction_no: callbackData.transactionNo,
                vnpay_response_code: '51', // Không đủ số dư
                vnpay_bank_code: callbackData.bankCode,
                transaction_ref: callbackData.bankTranNo || callbackData.transactionNo,
                notes: 'Số dư tài khoản không đủ để thực hiện giao dịch'
              }
            })

            // Tạo payment log cho viện
            if (paymentWithDetails) {
              const payerName =
                paymentWithDetails.payer?.familyProfile?.full_name ||
                paymentWithDetails.payer?.resident?.full_name ||
                paymentWithDetails.payer?.email ||
                'Unknown'

              await dbmAccountService.createPaymentLog({
                institution_id: paymentWithDetails.contract.institution_id,
                payment_id: payment.payment_id,
                amount: payment.amount,
                payment_method: 'VNPAY',
                status: 'FAILED',
                payer_id: payment.payer_id,
                payer_type: paymentWithDetails.payer?.role === 'Family' ? 'family' : 'resident',
                payer_name: payerName,
                resident_id: paymentWithDetails.contract.resident_id,
                resident_name: paymentWithDetails.contract.resident.full_name,
                contract_id: payment.contract_id,
                vnpay_order_id: payment.vnpay_order_id || undefined,
                vnpay_transaction_no: callbackData.transactionNo,
                vnpay_response_code: '51',
                vnpay_bank_code: callbackData.bankCode,
                period_start: payment.period_start,
                period_end: payment.period_end,
                notes: 'Số dư tài khoản không đủ để thực hiện giao dịch'
              })
            }

            throw new ErrorWithStatus({
              message: 'Số dư tài khoản không đủ để thực hiện giao dịch',
              status: HTTP_STATUS.BAD_REQUEST
            })
          }

          // Trừ tiền từ tài khoản mock
          const account = await dbmAccountService.getAccountByUserId(payment.payer_id)
          accountId = account.account_id

          transactionHistory = await dbmAccountService.debitAccount(
            payment.payer_id,
            payment.amount,
            `Thanh toán hợp đồng dịch vụ - ${paymentWithDetails?.contract.resident.full_name || 'N/A'}`,
            payment.payment_id,
            payment.vnpay_order_id || undefined
          )
        } catch (error: any) {
          console.error('Error processing mock payment:', error)
          // Nếu lỗi không phải do thiếu tiền, vẫn tiếp tục nhưng không trừ tiền
          if (error.message?.includes('Số dư')) {
            throw error
          }
        }
      }

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

      // Tạo payment log cho viện
      if (paymentWithDetails) {
        const payerName =
          paymentWithDetails.payer?.familyProfile?.full_name ||
          paymentWithDetails.payer?.resident?.full_name ||
          paymentWithDetails.payer?.email ||
          'Unknown'

        await dbmAccountService.createPaymentLog({
          institution_id: paymentWithDetails.contract.institution_id,
          payment_id: payment.payment_id,
          amount: payment.amount,
          payment_method: 'VNPAY',
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          payer_id: payment.payer_id || undefined,
          payer_type: paymentWithDetails.payer?.role === 'Family' ? 'family' : 'resident',
          payer_name: payerName,
          resident_id: paymentWithDetails.contract.resident_id,
          resident_name: paymentWithDetails.contract.resident.full_name,
          contract_id: payment.contract_id,
          vnpay_order_id: payment.vnpay_order_id || undefined,
          vnpay_transaction_no: callbackData.transactionNo,
          vnpay_response_code: callbackData.responseCode,
          vnpay_bank_code: callbackData.bankCode,
          account_id: accountId || undefined,
          transaction_id: transactionHistory?.transaction_id || undefined,
          period_start: payment.period_start,
          period_end: payment.period_end,
          notes: isSuccess
            ? 'Thanh toán thành công qua VNPay'
            : `Thanh toán thất bại: ${getVNPayResponseMessage(callbackData.responseCode)}`
        })
      }

      return updated
    })

    return updatedPayment
  }

  /**
   * Xử lý IPN (Instant Payment Notification) từ VNPay
   * IPN được gọi tự động bởi VNPay server để thông báo về trạng thái thanh toán
   * Logic tương tự handleCallback nhưng không redirect
   * @param queryParams - Query params từ VNPay IPN
   * @returns Payment record đã được cập nhật
   */
  handleIPN = async (queryParams: Record<string, any>) => {
    console.log('VNPay IPN received:', JSON.stringify(queryParams, null, 2))

    // Verify secure hash
    if (!verifyVNPaySecureHash(queryParams, queryParams.vnp_SecureHash)) {
      console.error('Invalid secure hash from VNPay IPN')
      throw new ErrorWithStatus({
        message: 'Invalid secure hash from VNPay IPN',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Parse IPN params (tương tự callback)
    const ipnData = parseVNPayCallback(queryParams)
    console.log('Parsed IPN data:', JSON.stringify(ipnData, null, 2))

    // Tìm payment theo order ID
    const payment = await prisma.payment.findFirst({
      where: {
        vnpay_order_id: ipnData.txnRef
      },
      include: {
        contract: {
          include: {
            resident: {
              select: {
                resident_id: true,
                full_name: true
              }
            },
            institution: {
              select: {
                institution_id: true,
                name: true
              }
            }
          }
        },
        payer: {
          include: {
            familyProfile: {
              select: {
                full_name: true
              }
            },
            resident: {
              select: {
                full_name: true
              }
            }
          }
        }
      }
    })

    if (!payment) {
      console.error(`Payment not found for order ID: ${ipnData.txnRef}`)
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    console.log(
      `Payment found: ${payment.payment_id}, current status: ${payment.status}, response code: ${ipnData.responseCode}`
    )

    // Kiểm tra xem payment đã được xử lý chưa
    if (payment.status === 'SUCCESS') {
      return payment
    }

    // Cập nhật payment status
    const isSuccess = isVNPaySuccess(ipnData.responseCode)

    // Transaction để đảm bảo tính nhất quán
    const updatedPayment = await prisma.$transaction(async (tx) => {
      let transactionHistory = null
      let accountId = null

      // Nếu thanh toán thành công và có payer_id, trừ tiền từ tài khoản mock
      if (isSuccess && payment.payer_id) {
        try {
          // Kiểm tra số dư trước khi trừ tiền
          const hasBalance = await dbmAccountService.checkBalance(payment.payer_id, payment.amount)

          if (!hasBalance) {
            // Không đủ tiền, đánh dấu payment là FAILED
            await tx.payment.update({
              where: { payment_id: payment.payment_id },
              data: {
                status: 'FAILED',
                vnpay_transaction_no: ipnData.transactionNo,
                vnpay_response_code: '51', // Không đủ số dư
                vnpay_bank_code: ipnData.bankCode,
                transaction_ref: ipnData.bankTranNo || ipnData.transactionNo,
                notes: 'Số dư tài khoản không đủ để thực hiện giao dịch'
              }
            })

            // Tạo payment log cho viện
            const payerName =
              payment.payer?.familyProfile?.full_name ||
              payment.payer?.resident?.full_name ||
              payment.payer?.email ||
              'Unknown'

            await dbmAccountService.createPaymentLog({
              institution_id: payment.contract.institution_id,
              payment_id: payment.payment_id,
              amount: payment.amount,
              payment_method: 'VNPAY',
              status: 'FAILED',
              payer_id: payment.payer_id,
              payer_type: payment.payer?.role === 'Family' ? 'family' : 'resident',
              payer_name: payerName,
              resident_id: payment.contract.resident_id,
              resident_name: payment.contract.resident.full_name,
              contract_id: payment.contract_id,
              vnpay_order_id: payment.vnpay_order_id || undefined,
              vnpay_transaction_no: ipnData.transactionNo,
              vnpay_response_code: '51',
              vnpay_bank_code: ipnData.bankCode,
              period_start: payment.period_start,
              period_end: payment.period_end,
              notes: 'Số dư tài khoản không đủ để thực hiện giao dịch'
            })

            throw new ErrorWithStatus({
              message: 'Số dư tài khoản không đủ để thực hiện giao dịch',
              status: HTTP_STATUS.BAD_REQUEST
            })
          }

          // Trừ tiền từ tài khoản mock
          const account = await dbmAccountService.getAccountByUserId(payment.payer_id)
          accountId = account.account_id

          transactionHistory = await dbmAccountService.debitAccount(
            payment.payer_id,
            payment.amount,
            `Thanh toán hợp đồng dịch vụ - ${payment.contract.resident.full_name}`,
            payment.payment_id,
            payment.vnpay_order_id || undefined
          )
        } catch (error: any) {
          console.error('Error processing mock payment in IPN:', error)
          if (error.message?.includes('Số dư')) {
            throw error
          }
        }
      }

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

      // Tạo payment log cho viện
      const payerName =
        payment.payer?.familyProfile?.full_name ||
        payment.payer?.resident?.full_name ||
        payment.payer?.email ||
        'Unknown'

      await dbmAccountService.createPaymentLog({
        institution_id: payment.contract.institution_id,
        payment_id: payment.payment_id,
        amount: payment.amount,
        payment_method: 'VNPAY',
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        payer_id: payment.payer_id || undefined,
        payer_type: payment.payer?.role === 'Family' ? 'family' : 'resident',
        payer_name: payerName,
        resident_id: payment.contract.resident_id,
        resident_name: payment.contract.resident.full_name,
        contract_id: payment.contract_id,
        vnpay_order_id: payment.vnpay_order_id || undefined,
        vnpay_transaction_no: ipnData.transactionNo,
        vnpay_response_code: ipnData.responseCode,
        vnpay_bank_code: ipnData.bankCode,
        account_id: accountId || undefined,
        transaction_id: transactionHistory?.transaction_id || undefined,
        period_start: payment.period_start,
        period_end: payment.period_end,
        notes: isSuccess
          ? 'Thanh toán thành công qua VNPay'
          : `Thanh toán thất bại: ${getVNPayResponseMessage(ipnData.responseCode)}`
      })

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
