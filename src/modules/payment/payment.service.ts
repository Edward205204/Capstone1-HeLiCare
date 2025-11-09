import { PaymentMethod, PaymentStatus, PaymentTransactionStatus, ContractStatus } from '@prisma/client'
import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  CreatePaymentReqBody,
  GetPaymentsReqQuery,
  UpdatePaymentStatusReqBody,
  ConfirmCODPaymentReqBody,
  InitiateMomoPaymentReqBody,
  MomoPaymentCallbackQuery,
  PaymentWithDetails
} from './payment.dto'
import { momoService } from '~/utils/momo.service'
import { nanoid } from 'nanoid'

class PaymentService {
  /**
   * Create a new payment for a contract
   */
  async createPayment(family_user_id: string, paymentData: CreatePaymentReqBody) {
    const { contract_id, payment_method, payment_period_start, payment_period_end, notes } = paymentData

    // Get contract with services
    const contract = await prisma.contract.findUnique({
      where: { contract_id },
      include: {
        contractServices: {
          include: {
            package: true
          }
        },
        resident: true,
        family_user: true
      }
    })

    if (!contract) {
      throw new ErrorWithStatus({
        message: 'Contract not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Verify family user has access to this contract
    if (contract.family_user_id !== family_user_id) {
      throw new ErrorWithStatus({
        message: 'You do not have access to this contract',
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    // Verify contract is active
    if (contract.status !== ContractStatus.active) {
      throw new ErrorWithStatus({
        message: 'Contract is not active',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Calculate payment amount based on contract services and period
    const periodStart = new Date(payment_period_start)
    const periodEnd = new Date(payment_period_end)
    const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))

    let amount = 0
    for (const contractService of contract.contractServices) {
      if (contractService.status === 'active') {
        // Calculate daily rate based on payment frequency
        const dailyRate = contract.payment_frequency === 'monthly'
          ? contractService.price_at_signing / 30
          : contractService.price_at_signing / 365

        amount += dailyRate * daysInPeriod
      }
    }

    // Round to 2 decimal places
    amount = Math.round(amount * 100) / 100

    // Calculate due date (default to end of payment period)
    const dueDate = new Date(periodEnd)

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        contract_id,
        family_user_id,
        institution_id: contract.institution_id,
        amount,
        payment_method,
        status: PaymentStatus.pending,
        due_date: dueDate,
        payment_period_start: periodStart,
        payment_period_end: periodEnd,
        notes
      },
      include: {
        contract: {
          select: {
            contract_id: true,
            contract_number: true,
            resident: {
              select: {
                resident_id: true,
                full_name: true
              }
            }
          }
        }
      }
    })

    return payment
  }

  /**
   * Get payments with filters
   */
  async getPayments(user_id: string, user_role: string, institution_id: string, query: GetPaymentsReqQuery) {
    const { contract_id, status, payment_method, start_date, end_date, take = 20, skip = 0 } = query

    const where: any = {
      institution_id
    }

    // Family users can only see their own payments
    if (user_role === 'Family') {
      where.family_user_id = user_id
    }

    if (contract_id) {
      where.contract_id = contract_id
    }

    if (status) {
      where.status = status
    }

    if (payment_method) {
      where.payment_method = payment_method
    }

    if (start_date || end_date) {
      where.due_date = {}
      if (start_date) {
        where.due_date.gte = new Date(start_date)
      }
      if (end_date) {
        where.due_date.lte = new Date(end_date)
      }
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          contract: {
            select: {
              contract_id: true,
              contract_number: true,
              resident: {
                select: {
                  resident_id: true,
                  full_name: true
                }
              }
            }
          },
          transactions: {
            select: {
              transaction_id: true,
              transaction_code: true,
              status: true,
              gateway_transaction_id: true,
              created_at: true
            },
            orderBy: {
              created_at: 'desc'
            }
          }
        },
        orderBy: {
          due_date: 'asc'
        },
        take,
        skip
      }),
      prisma.payment.count({ where })
    ])

    return { payments, total }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(payment_id: string, user_id: string, user_role: string) {
    const payment = await prisma.payment.findUnique({
      where: { payment_id },
      include: {
        contract: {
          select: {
            contract_id: true,
            contract_number: true,
            resident: {
              select: {
                resident_id: true,
                full_name: true
              }
            }
          }
        },
        transactions: {
          select: {
            transaction_id: true,
            transaction_code: true,
            status: true,
            gateway_transaction_id: true,
            error_message: true,
            gateway_response: true,
            created_at: true,
            completed_at: true
          },
          orderBy: {
            created_at: 'desc'
          }
        },
        family_user: {
          select: {
            user_id: true,
            email: true,
            familyProfile: {
              select: {
                full_name: true,
                phone: true
              }
            }
          }
        }
      }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Family users can only see their own payments
    if (user_role === 'Family' && payment.family_user_id !== user_id) {
      throw new ErrorWithStatus({
        message: 'You do not have access to this payment',
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    return payment
  }

  /**
   * Initiate Momo payment
   */
  async initiateMomoPayment(payment_id: string, return_url?: string, notify_url?: string) {
    // Get payment
    const payment = await prisma.payment.findUnique({
      where: { payment_id },
      include: {
        contract: {
          include: {
            resident: true
          }
        },
        family_user: {
          include: {
            familyProfile: true
          }
        }
      }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (payment.payment_method !== PaymentMethod.momo) {
      throw new ErrorWithStatus({
        message: 'Payment method is not Momo',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    if (payment.status !== PaymentStatus.pending) {
      throw new ErrorWithStatus({
        message: 'Payment is not in pending status',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Create transaction
    const transaction = await prisma.paymentTransaction.create({
      data: {
        payment_id,
        payment_method: PaymentMethod.momo,
        amount: payment.amount,
        status: PaymentTransactionStatus.pending
      }
    })

    // Create order info
    const orderInfo = `Thanh toan hop dong ${payment.contract.contract_number} - ${payment.contract.resident.full_name}`
    const orderId = `PAY${payment_id.substring(0, 8).toUpperCase()}${Date.now()}`

    try {
      // Create Momo payment request
      const momoResponse = await momoService.createPayment({
        orderId,
        amount: Math.round(payment.amount),
        orderInfo,
        requestId: transaction.transaction_id,
        extraData: JSON.stringify({ payment_id, transaction_id: transaction.transaction_id }),
        redirectUrl: return_url,
        ipnUrl: notify_url
      })

      // Update transaction with gateway response
      await prisma.paymentTransaction.update({
        where: { transaction_id: transaction.transaction_id },
        data: {
          gateway_transaction_id: momoResponse.orderId,
          gateway_response: momoResponse as any,
          status: PaymentTransactionStatus.processing
        }
      })

      return {
        payment_url: momoResponse.payUrl || momoResponse.deeplink || momoResponse.qrCodeUrl,
        transaction_id: transaction.transaction_id,
        payment_id: payment.payment_id,
        order_id: orderId
      }
    } catch (error) {
      // Update transaction as failed
      await prisma.paymentTransaction.update({
        where: { transaction_id: transaction.transaction_id },
        data: {
          status: PaymentTransactionStatus.failed,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          gateway_response: { error: error instanceof Error ? error.message : 'Unknown error' } as any
        }
      })

      throw new ErrorWithStatus({
        message: `Failed to initiate Momo payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }
  }

  /**
   * Handle Momo payment callback
   */
  async handleMomoCallback(callbackData: MomoPaymentCallbackQuery) {
    // Verify signature
    const isValid = momoService.verifyCallbackSignature(callbackData as any)

    if (!isValid) {
      throw new ErrorWithStatus({
        message: 'Invalid Momo callback signature',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Find transaction by order ID
    const extraData = callbackData.extraData ? JSON.parse(callbackData.extraData) : {}
    const payment_id = extraData.payment_id

    if (!payment_id) {
      throw new ErrorWithStatus({
        message: 'Payment ID not found in callback data',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Get payment
    const payment = await prisma.payment.findUnique({
      where: { payment_id }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Find transaction
    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        payment_id,
        gateway_transaction_id: callbackData.orderId
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    if (!transaction) {
      throw new ErrorWithStatus({
        message: 'Transaction not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Update transaction
    const transactionStatus =
      callbackData.resultCode === 0
        ? PaymentTransactionStatus.completed
        : PaymentTransactionStatus.failed

    await prisma.paymentTransaction.update({
      where: { transaction_id: transaction.transaction_id },
      data: {
        transaction_code: callbackData.transId,
        status: transactionStatus,
        gateway_response: callbackData as any,
        error_message: callbackData.resultCode !== 0 ? callbackData.message : null,
        completed_at: callbackData.resultCode === 0 ? new Date() : null
      }
    })

    // Update payment if successful
    if (callbackData.resultCode === 0) {
      await prisma.payment.update({
        where: { payment_id },
        data: {
          status: PaymentStatus.paid,
          paid_date: new Date()
        }
      })
    }

    return {
      success: callbackData.resultCode === 0,
      message: callbackData.message,
      payment_id,
      transaction_id: transaction.transaction_id
    }
  }

  /**
   * Confirm COD payment
   */
  async confirmCODPayment(payment_id: string, confirmation_code?: string, notes?: string) {
    const payment = await prisma.payment.findUnique({
      where: { payment_id }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (payment.payment_method !== PaymentMethod.COD) {
      throw new ErrorWithStatus({
        message: 'Payment method is not COD',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    if (payment.status !== PaymentStatus.pending) {
      throw new ErrorWithStatus({
        message: 'Payment is not in pending status',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Create transaction for COD
    await prisma.paymentTransaction.create({
      data: {
        payment_id,
        transaction_code: confirmation_code || `COD${nanoid(10)}`,
        payment_method: PaymentMethod.COD,
        amount: payment.amount,
        status: PaymentTransactionStatus.completed,
        completed_at: new Date()
      }
    })

    // Update payment
    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: {
        status: PaymentStatus.paid,
        paid_date: new Date(),
        notes: notes || payment.notes
      },
      include: {
        contract: {
          select: {
            contract_id: true,
            contract_number: true,
            resident: {
              select: {
                resident_id: true,
                full_name: true
              }
            }
          }
        }
      }
    })

    return updatedPayment
  }

  /**
   * Update payment status (for admin/staff)
   */
  async updatePaymentStatus(payment_id: string, updateData: UpdatePaymentStatusReqBody) {
    const payment = await prisma.payment.findUnique({
      where: { payment_id }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const updatePayload: any = {
      status: updateData.status
    }

    if (updateData.notes) {
      updatePayload.notes = updateData.notes
    }

    if (updateData.status === PaymentStatus.paid && !payment.paid_date) {
      updatePayload.paid_date = updateData.paid_date ? new Date(updateData.paid_date) : new Date()
    }

    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: updatePayload,
      include: {
        contract: {
          select: {
            contract_id: true,
            contract_number: true,
            resident: {
              select: {
                resident_id: true,
                full_name: true
              }
            }
          }
        }
      }
    })

    return updatedPayment
  }

  /**
   * Get payments by contract
   */
  async getPaymentsByContract(contract_id: string, user_id: string, user_role: string) {
    const contract = await prisma.contract.findUnique({
      where: { contract_id }
    })

    if (!contract) {
      throw new ErrorWithStatus({
        message: 'Contract not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Family users can only see their own contract payments
    if (user_role === 'Family' && contract.family_user_id !== user_id) {
      throw new ErrorWithStatus({
        message: 'You do not have access to this contract',
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    const payments = await prisma.payment.findMany({
      where: { contract_id },
      include: {
        transactions: {
          select: {
            transaction_id: true,
            transaction_code: true,
            status: true,
            gateway_transaction_id: true,
            created_at: true
          },
          orderBy: {
            created_at: 'desc'
          }
        }
      },
      orderBy: {
        due_date: 'asc'
      }
    })

    return payments
  }

  /**
   * Generate payment schedule for a contract
   */
  async generatePaymentSchedule(contract_id: string, start_date: Date, end_date: Date) {
    const contract = await prisma.contract.findUnique({
      where: { contract_id },
      include: {
        contractServices: {
          include: {
            package: true
          }
        }
      }
    })

    if (!contract) {
      throw new ErrorWithStatus({
        message: 'Contract not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const payments: any[] = []
    const currentDate = new Date(start_date)
    const endDate = new Date(end_date)

    while (currentDate < endDate) {
      const periodStart = new Date(currentDate)
      let periodEnd: Date

      if (contract.payment_frequency === 'monthly') {
        periodEnd = new Date(currentDate)
        periodEnd.setMonth(periodEnd.getMonth() + 1)
      } else {
        // annually
        periodEnd = new Date(currentDate)
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      }

      if (periodEnd > endDate) {
        periodEnd = endDate
      }

      // Calculate amount for this period
      const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
      let amount = 0

      for (const contractService of contract.contractServices) {
        if (contractService.status === 'active') {
          const dailyRate = contract.payment_frequency === 'monthly'
            ? contractService.price_at_signing / 30
            : contractService.price_at_signing / 365

          amount += dailyRate * daysInPeriod
        }
      }

      amount = Math.round(amount * 100) / 100

      payments.push({
        period_start: periodStart,
        period_end: periodEnd,
        due_date: periodEnd,
        amount
      })

      currentDate.setTime(periodEnd.getTime())
    }

    return payments
  }
}

const paymentService = new PaymentService()

export { paymentService, PaymentService }

