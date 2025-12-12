import { Prisma, PaymentMethod, PaymentStatus } from '@prisma/client'
import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  CreatePaymentReqBody,
  UpdatePaymentReqBody,
  UploadProofReqBody,
  PaymentResponse,
  GetPaymentsQuery,
  PaymentListResponse
} from './payment.dto'
import { serviceContractService } from '../service-contract/service-contract.service'
import { commonService } from '~/common/common.service'

class PaymentService {
  // Tạo payment mới
  createPayment = async (payer_id: string, data: CreatePaymentReqBody): Promise<PaymentResponse> => {
    const { contract_id, payment_method, amount, period_start, period_end, notes } = data

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

    // Validate amount phải khớp với contract amount
    if (Math.abs(amount - contract.amount) > 0.01) {
      throw new ErrorWithStatus({
        message: `Payment amount must match contract amount (${contract.amount})`,
        status: HTTP_STATUS.BAD_REQUEST
      })
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

    // Kiểm tra xem đã có payment thành công cho period này chưa
    const existingPayment = await prisma.payment.findFirst({
      where: {
        contract_id,
        status: 'SUCCESS',
        period_start: periodStart,
        period_end: periodEnd
      }
    })

    if (existingPayment) {
      throw new ErrorWithStatus({
        message: 'Payment for this period already exists',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Tạo payment
    const payment = await prisma.payment.create({
      data: {
        contract_id,
        payer_id,
        amount,
        payment_method,
        status: 'PENDING',
        period_start: periodStart,
        period_end: periodEnd,
        notes: notes || null
      },
      include: {
        contract: {
          include: {
            resident: {
              select: {
                resident_id: true,
                full_name: true
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
            }
          }
        }
      }
    })

    return this.formatPaymentResponse(payment)
  }

  // Lấy danh sách payments
  getPayments = async (params: GetPaymentsQuery): Promise<PaymentListResponse> => {
    const { contract_id, payer_id, status, payment_method, start_date, end_date, page, limit } = params

    const where: Prisma.PaymentWhereInput = {}

    if (contract_id) {
      where.contract_id = contract_id
    }

    if (payer_id) {
      where.payer_id = payer_id
    }

    if (status) {
      where.status = status
    }

    if (payment_method) {
      where.payment_method = payment_method
    }

    if (start_date || end_date) {
      where.created_at = {}
      if (start_date) {
        where.created_at.gte = new Date(start_date)
      }
      if (end_date) {
        where.created_at.lte = new Date(end_date)
      }
    }

    const include = {
      contract: {
        include: {
          resident: {
            select: {
              resident_id: true,
              full_name: true
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
          }
        }
      },
      verified_by: {
        include: {
          staffProfile: {
            select: {
              full_name: true
            }
          }
        }
      }
    }

    if (!page || !limit) {
      const payments = await prisma.payment.findMany({
        where,
        include,
        orderBy: {
          created_at: 'desc'
        }
      })

      return {
        payments: payments.map(this.formatPaymentResponse)
      }
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const safePage = Math.max(page, 1)
    const skip = (safePage - 1) * safeLimit

    const [total, payments] = await prisma.$transaction([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include,
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: safeLimit
      })
    ])

    return {
      payments: payments.map(this.formatPaymentResponse),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit))
      }
    }
  }

  // Lấy payment theo ID
  getPaymentById = async (payment_id: string): Promise<PaymentResponse> => {
    const payment = await prisma.payment.findUnique({
      where: { payment_id },
      include: {
        contract: {
          include: {
            resident: {
              select: {
                resident_id: true,
                full_name: true
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
            }
          }
        },
        verified_by: {
          include: {
            staffProfile: {
              select: {
                full_name: true
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

    return this.formatPaymentResponse(payment)
  }

  // Lấy payments của Family user
  getPaymentsByFamily = async (family_user_id: string): Promise<PaymentResponse[]> => {
    const payments = await prisma.payment.findMany({
      where: {
        payer_id: family_user_id
      },
      include: {
        contract: {
          include: {
            resident: {
              select: {
                resident_id: true,
                full_name: true
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
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return payments.map(this.formatPaymentResponse)
  }

  // Upload proof image (cho chuyển khoản)
  uploadProof = async (payment_id: string, payer_id: string, data: UploadProofReqBody): Promise<PaymentResponse> => {
    const { proof_image_url, transaction_ref, notes } = data

    // Kiểm tra payment tồn tại và thuộc về payer
    const payment = await prisma.payment.findFirst({
      where: {
        payment_id,
        payer_id
      }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found or you do not have permission to update it',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Chỉ cho phép upload proof cho payment PENDING
    if (payment.status !== 'PENDING') {
      throw new ErrorWithStatus({
        message: 'Can only upload proof for pending payments',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Chỉ cho phép upload proof cho TRANSFER payment
    if (payment.payment_method !== 'TRANSFER') {
      throw new ErrorWithStatus({
        message: 'Can only upload proof for TRANSFER payments',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Cập nhật payment
    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: {
        proof_image_url,
        transaction_ref: transaction_ref || payment.transaction_ref,
        notes: notes || payment.notes
      },
      include: {
        contract: {
          include: {
            resident: {
              select: {
                resident_id: true,
                full_name: true
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
            }
          }
        }
      }
    })

    return this.formatPaymentResponse(updatedPayment)
  }

  // Admin verify payment (cho chuyển khoản manual)
  verifyPayment = async (
    payment_id: string,
    verified_by_id: string,
    institution_id: string
  ): Promise<PaymentResponse> => {
    // Kiểm tra payment tồn tại
    const payment = await prisma.payment.findFirst({
      where: { payment_id },
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

    // Kiểm tra contract thuộc institution
    if (payment.contract.institution_id !== institution_id) {
      throw new ErrorWithStatus({
        message: 'Payment does not belong to this institution',
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    // Chỉ có thể verify payment PENDING
    if (payment.status !== 'PENDING') {
      throw new ErrorWithStatus({
        message: 'Can only verify pending payments',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Transaction để đảm bảo tính nhất quán
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // Cập nhật payment status
      const updated = await tx.payment.update({
        where: { payment_id },
        data: {
          status: 'SUCCESS',
          verified_by_id,
          verified_at: new Date()
        },
        include: {
          contract: {
            include: {
              resident: {
                select: {
                  resident_id: true,
                  full_name: true
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
              }
            }
          },
          verified_by: {
            include: {
              staffProfile: {
                select: {
                  full_name: true
                }
              }
            }
          }
        }
      })

      // Cập nhật next_billing_date của contract
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

      return updated
    })

    return this.formatPaymentResponse(updatedPayment)
  }

  // Cancel payment
  cancelPayment = async (payment_id: string, payer_id: string): Promise<void> => {
    // Kiểm tra payment tồn tại và thuộc về payer
    const payment = await prisma.payment.findFirst({
      where: {
        payment_id,
        payer_id
      }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found or you do not have permission to cancel it',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Chỉ có thể cancel payment PENDING
    if (payment.status !== 'PENDING') {
      throw new ErrorWithStatus({
        message: 'Can only cancel pending payments',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Cập nhật status thành FAILED (hoặc có thể xóa, nhưng để FAILED để có lịch sử)
    await prisma.payment.update({
      where: { payment_id },
      data: {
        status: 'FAILED',
        notes: (payment.notes || '') + '\n[Cancelled by user]'
      }
    })
  }

  // Format response
  private formatPaymentResponse = (payment: any): PaymentResponse => {
    return {
      payment_id: payment.payment_id,
      contract_id: payment.contract_id,
      payer_id: payment.payer_id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      status: payment.status,
      transaction_ref: payment.transaction_ref,
      proof_image_url: payment.proof_image_url,
      vnpay_transaction_no: payment.vnpay_transaction_no,
      vnpay_order_id: payment.vnpay_order_id,
      vnpay_response_code: payment.vnpay_response_code,
      vnpay_bank_code: payment.vnpay_bank_code,
      notes: payment.notes,
      verified_by_id: payment.verified_by_id,
      verified_at: payment.verified_at ? payment.verified_at.toISOString() : null,
      period_start: payment.period_start.toISOString(),
      period_end: payment.period_end.toISOString(),
      created_at: payment.created_at.toISOString(),
      updated_at: payment.updated_at.toISOString(),
      contract: payment.contract
        ? {
            contract_id: payment.contract.contract_id,
            resident_id: payment.contract.resident_id,
            amount: payment.contract.amount,
            billing_cycle: payment.contract.billing_cycle,
            next_billing_date: payment.contract.next_billing_date.toISOString(),
            resident: payment.contract.resident
              ? {
                  resident_id: payment.contract.resident.resident_id,
                  full_name: payment.contract.resident.full_name
                }
              : undefined
          }
        : undefined,
      payer: payment.payer
        ? {
            user_id: payment.payer.user_id,
            email: payment.payer.email,
            familyProfile: payment.payer.familyProfile
              ? {
                  full_name: payment.payer.familyProfile.full_name
                }
              : undefined
          }
        : undefined,
      verified_by: payment.verified_by
        ? {
            user_id: payment.verified_by.user_id,
            email: payment.verified_by.email,
            staffProfile: payment.verified_by.staffProfile
              ? {
                  full_name: payment.verified_by.staffProfile.full_name
                }
              : undefined
          }
        : undefined
    }
  }
}

export const paymentService = new PaymentService()
