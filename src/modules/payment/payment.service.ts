import { prisma } from '~/utils/db'
import {
  CreatePaymentParams,
  GetPaymentsParams,
  InitiatePayPalPaymentParams,
  UpdatePaymentStatusParams,
  ProcessPayPalWebhookParams,
  CreateBankTransferPaymentParams,
  CreateVisaPaymentParams
} from './payment.dto'
import { PaymentMethod, PaymentStatus } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { nanoid } from 'nanoid'
import { PayPalClient } from './paypal.client'

class PaymentService {
  private paypalClient: PayPalClient

  constructor() {
    this.paypalClient = new PayPalClient()
  }

  // Tạo payment mới
  createPayment = async (params: CreatePaymentParams) => {
    const { contract_id, family_user_id, institution_id, method, due_date, payment_items, notes } = params

    // Kiểm tra contract tồn tại và active
    const contract = await prisma.contract.findUnique({
      where: { contract_id },
      include: {
        contractServices: true,
        resident: true
      }
    })

    if (!contract) {
      throw new ErrorWithStatus({
        message: 'Contract not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (contract.status !== 'active') {
      throw new ErrorWithStatus({
        message: 'Contract is not active',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Tính tổng số tiền từ payment items
    const totalAmount = payment_items.reduce((sum, item) => sum + item.total_price, 0)

    // Tạo payment number duy nhất
    const payment_number = `PAY-${Date.now()}-${nanoid(8).toUpperCase()}`

    // Tạo payment và payment items
    const payment = await prisma.payment.create({
      data: {
        contract_id,
        family_user_id,
        institution_id,
        payment_number,
        amount: totalAmount,
        method,
        status: PaymentStatus.pending,
        due_date: new Date(due_date),
        notes,
        paymentItems: {
          create: payment_items.map((item) => ({
            package_id: item.package_id,
            contract_service_id: item.contract_service_id,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            period_start: new Date(item.period_start),
            period_end: new Date(item.period_end),
            notes: item.notes
          }))
        }
      },
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
        },
        paymentItems: {
          include: {
            package: true
          }
        }
      }
    })

    return payment
  }

  // Lấy danh sách payments
  getPayments = async (params: GetPaymentsParams) => {
    const { institution_id, contract_id, family_user_id, status, method, take = 20, skip = 0 } = params

    const where: any = { institution_id }

    if (contract_id) {
      where.contract_id = contract_id
    }

    if (family_user_id) {
      where.family_user_id = family_user_id
    }

    if (status) {
      where.status = status
    }

    if (method) {
      where.method = method
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
          },
          paymentItems: {
            include: {
              package: {
                select: {
                  package_id: true,
                  name: true,
                  type: true
                }
              }
            }
          }
        },
        take,
        skip,
        orderBy: { created_at: 'desc' }
      }),
      prisma.payment.count({ where })
    ])

    return { payments, total }
  }

  // Lấy payment theo ID
  getPaymentById = async (payment_id: string) => {
    const payment = await prisma.payment.findUnique({
      where: { payment_id },
      include: {
        contract: {
          include: {
            resident: true,
            contractServices: {
              include: {
                package: true
              }
            }
          }
        },
        family_user: {
          include: {
            familyProfile: true
          }
        },
        institution: {
          select: {
            institution_id: true,
            name: true,
            address: true,
            contact_info: true
          }
        },
        paymentItems: {
          include: {
            package: true
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

    return payment
  }

  // Khởi tạo thanh toán PayPal
  initiatePayPalPayment = async (params: InitiatePayPalPaymentParams) => {
    const { payment_id, return_url, cancel_url } = params

    const payment = await this.getPaymentById(payment_id)

    if (payment.method !== PaymentMethod.paypal) {
      throw new ErrorWithStatus({
        message: 'Payment method is not PayPal',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    if (payment.status !== PaymentStatus.pending) {
      throw new ErrorWithStatus({
        message: 'Payment is not in pending status',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Tạo PayPal order
    const paypalOrder = await this.paypalClient.createOrder({
      amount: payment.amount,
      currency: 'USD',
      description: `Payment for contract ${payment.contract.contract_number}`,
      custom_id: payment_id,
      return_url: return_url,
      cancel_url: cancel_url
    })

    // Cập nhật payment với PayPal order ID
    await prisma.payment.update({
      where: { payment_id },
      data: {
        status: PaymentStatus.processing,
        payment_reference: paypalOrder.id,
        metadata: {
          paypal_order_id: paypalOrder.id,
          approval_url: paypalOrder.links?.find((link: any) => link.rel === 'approve')?.href
        }
      }
    })

    return {
      payment_id,
      approval_url: paypalOrder.links?.find((link: any) => link.rel === 'approve')?.href,
      order_id: paypalOrder.id
    }
  }

  // Xử lý PayPal webhook
  processPayPalWebhook = async (params: ProcessPayPalWebhookParams) => {
    const { event_type, resource } = params

    if (event_type === 'PAYMENT.CAPTURE.COMPLETED' || event_type === 'CHECKOUT.ORDER.APPROVED') {
      const order_id = resource.id || resource.order_id
      
      // Tìm payment theo PayPal order ID
      const payment = await prisma.payment.findFirst({
        where: {
          payment_reference: order_id,
          method: PaymentMethod.paypal
        }
      })

      if (!payment) {
        console.error(`Payment not found for PayPal order: ${order_id}`)
        return
      }

      // Cập nhật trạng thái thanh toán
      await prisma.payment.update({
        where: { payment_id: payment.payment_id },
        data: {
          status: PaymentStatus.paid,
          paid_at: new Date(),
          metadata: {
            ...(payment.metadata as any),
            webhook_event: event_type,
            webhook_resource: resource
          }
        }
      })
    } else if (event_type === 'PAYMENT.CAPTURE.DENIED' || event_type === 'PAYMENT.CAPTURE.REFUNDED') {
      const order_id = resource.id || resource.order_id
      
      const payment = await prisma.payment.findFirst({
        where: {
          payment_reference: order_id,
          method: PaymentMethod.paypal
        }
      })

      if (payment) {
        await prisma.payment.update({
          where: { payment_id: payment.payment_id },
          data: {
            status: event_type.includes('REFUNDED') ? PaymentStatus.refunded : PaymentStatus.failed,
            failure_reason: resource.reason_code || 'Payment denied',
            metadata: {
              ...(payment.metadata as any),
              webhook_event: event_type,
              webhook_resource: resource
            }
          }
        })
      }
    }
  }

  // Xác nhận thanh toán PayPal (sau khi user approve)
  confirmPayPalPayment = async (payment_id: string, order_id: string) => {
    const payment = await this.getPaymentById(payment_id)

    if (payment.payment_reference !== order_id) {
      throw new ErrorWithStatus({
        message: 'Invalid PayPal order ID',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Capture payment từ PayPal
    const captureResult = await this.paypalClient.captureOrder(order_id)

    if (captureResult.status === 'COMPLETED') {
      await prisma.payment.update({
        where: { payment_id },
        data: {
          status: PaymentStatus.paid,
          paid_at: new Date(),
          metadata: {
            ...(payment.metadata as any),
            capture_result: captureResult
          }
        }
      })

      return { success: true, payment }
    } else {
      await prisma.payment.update({
        where: { payment_id },
        data: {
          status: PaymentStatus.failed,
          failure_reason: 'Payment capture failed',
          metadata: {
            ...(payment.metadata as any),
            capture_result: captureResult
          }
        }
      })

      throw new ErrorWithStatus({
        message: 'Payment capture failed',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }
  }

  // Xử lý thanh toán COD
  processCODPayment = async (payment_id: string) => {
    const payment = await this.getPaymentById(payment_id)

    if (payment.method !== PaymentMethod.COD) {
      throw new ErrorWithStatus({
        message: 'Payment method is not COD',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // COD được đánh dấu là processing, sẽ được xác nhận thủ công bởi admin
    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: {
        status: PaymentStatus.processing,
        metadata: {
          cod_confirmed: false,
          confirmed_at: null
        }
      }
    })

    return updatedPayment
  }

  // Xác nhận COD (Admin only)
  confirmCODPayment = async (payment_id: string) => {
    const payment = await this.getPaymentById(payment_id)

    if (payment.method !== PaymentMethod.COD) {
      throw new ErrorWithStatus({
        message: 'Payment method is not COD',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: {
        status: PaymentStatus.paid,
        paid_at: new Date(),
        metadata: {
          cod_confirmed: true,
          confirmed_at: new Date().toISOString()
        }
      }
    })

    return updatedPayment
  }

  // Xử lý chuyển khoản ngân hàng
  processBankTransfer = async (params: CreateBankTransferPaymentParams) => {
    const { payment_id, bank_name, account_number, account_holder, transfer_reference } = params

    const payment = await this.getPaymentById(payment_id)

    if (payment.method !== PaymentMethod.bank_transfer) {
      throw new ErrorWithStatus({
        message: 'Payment method is not bank transfer',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Chuyển khoản cần được xác nhận thủ công bởi admin
    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: {
        status: PaymentStatus.processing,
        payment_reference: transfer_reference,
        metadata: {
          bank_name,
          account_number,
          account_holder,
          transfer_reference,
          confirmed: false
        }
      }
    })

    return updatedPayment
  }

  // Xác nhận chuyển khoản (Admin only)
  confirmBankTransfer = async (payment_id: string) => {
    const payment = await this.getPaymentById(payment_id)

    if (payment.method !== PaymentMethod.bank_transfer) {
      throw new ErrorWithStatus({
        message: 'Payment method is not bank transfer',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: {
        status: PaymentStatus.paid,
        paid_at: new Date(),
        metadata: {
          ...(payment.metadata as any),
          confirmed: true,
          confirmed_at: new Date().toISOString()
        }
      }
    })

    return updatedPayment
  }

  // Xử lý thanh toán Visa (giả lập - trong thực tế cần tích hợp gateway thẻ)
  processVisaPayment = async (params: CreateVisaPaymentParams) => {
    const { payment_id, card_number, card_holder, expiry_date, cvv } = params

    const payment = await this.getPaymentById(payment_id)

    if (payment.method !== PaymentMethod.visa) {
      throw new ErrorWithStatus({
        message: 'Payment method is not Visa',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // TODO: Tích hợp với payment gateway thực tế (Stripe, etc.)
    // Hiện tại chỉ lưu thông tin và đánh dấu processing
    // Trong production, cần xử lý bảo mật thông tin thẻ

    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: {
        status: PaymentStatus.processing,
        metadata: {
          card_holder,
          card_last4: card_number.slice(-4),
          expiry_date,
          // KHÔNG lưu CVV và số thẻ đầy đủ
          processed_at: new Date().toISOString()
        }
      }
    })

    // Giả lập xử lý thành công (trong thực tế cần gọi API gateway)
    // Simulate successful payment
    setTimeout(async () => {
      await prisma.payment.update({
        where: { payment_id },
        data: {
          status: PaymentStatus.paid,
          paid_at: new Date()
        }
      })
    }, 2000)

    return updatedPayment
  }

  // Cập nhật trạng thái payment (Admin only)
  updatePaymentStatus = async (params: UpdatePaymentStatusParams) => {
    const { payment_id, status, payment_reference, failure_reason, metadata, paid_at } = params

    const payment = await this.getPaymentById(payment_id)

    const updateData: any = {
      status
    }

    if (payment_reference) {
      updateData.payment_reference = payment_reference
    }

    if (failure_reason) {
      updateData.failure_reason = failure_reason
    }

    if (metadata) {
      updateData.metadata = metadata
    }

    if (paid_at) {
      updateData.paid_at = new Date(paid_at)
    } else if (status === PaymentStatus.paid && !payment.paid_at) {
      updateData.paid_at = new Date()
    }

    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: updateData
    })

    return updatedPayment
  }

  // Hủy payment
  cancelPayment = async (payment_id: string) => {
    const payment = await this.getPaymentById(payment_id)

    if (payment.status === PaymentStatus.paid) {
      throw new ErrorWithStatus({
        message: 'Cannot cancel a paid payment',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: {
        status: PaymentStatus.cancelled
      }
    })

    return updatedPayment
  }

  // Tính toán số tiền thanh toán từ contract services
  calculatePaymentAmount = async (contract_id: string, period_start: Date, period_end: Date) => {
    const contract = await prisma.contract.findUnique({
      where: { contract_id },
      include: {
        contractServices: {
          where: {
            status: 'active'
          },
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

    const paymentItems = contract.contractServices.map((contractService) => {
      const price = contract.payment_frequency === 'monthly' 
        ? contractService.package.price_monthly 
        : (contractService.package.price_annually || contractService.package.price_monthly * 12)

      return {
        package_id: contractService.package_id,
        contract_service_id: contractService.contract_service_id,
        item_name: contractService.package.name,
        quantity: 1,
        unit_price: price,
        total_price: price,
        period_start: new Date(period_start),
        period_end: new Date(period_end)
      }
    })

    const totalAmount = paymentItems.reduce((sum, item) => sum + item.total_price, 0)

    return {
      payment_items: paymentItems,
      total_amount: totalAmount
    }
  }
}

const paymentService = new PaymentService()

export { paymentService, PaymentService }

