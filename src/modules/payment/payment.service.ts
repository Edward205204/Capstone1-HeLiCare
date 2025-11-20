import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { PaymentMethod, PaymentStatus, PaymentFrequency } from '@prisma/client'
import {
  CreatePaymentParams,
  GeneratePaymentsFromContractParams,
  InitiatePayPalPaymentParams,
  CapturePayPalPaymentParams,
  UpdatePaymentStatusParams,
  GetPaymentsParams,
  ProcessCODPaymentParams,
  ProcessBankTransferParams,
  ProcessVisaPaymentParams
} from './payment.dto'
import { nanoid } from 'nanoid'
import { env } from '~/utils/dot.env'
import { OrdersApi, OrdersCreateRequest, OrdersCaptureRequest, Money } from '@paypal/paypal-server-sdk'

// Initialize PayPal SDK
let paypalClient: any = null

const getPayPalClient = () => {
  if (!paypalClient) {
    const { PayPalClient } = require('@paypal/paypal-server-sdk')
    const clientId = env.PAYPAL_CLIENT_ID
    const clientSecret = env.PAYPAL_CLIENT_SECRET
    const environment = env.PAYPAL_ENVIRONMENT || 'sandbox' // 'sandbox' or 'live'

    if (!clientId || !clientSecret) {
      throw new ErrorWithStatus({
        message: 'PayPal credentials not configured',
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    }

    paypalClient = new PayPalClient({
      clientId,
      clientSecret,
      environment
    })
  }
  return paypalClient
}

class PaymentService {
  constructor() {}

  // Generate unique payment number
  private generatePaymentNumber(): string {
    return `PAY-${Date.now()}-${nanoid(8).toUpperCase()}`
  }

  // Create a single payment record
  createPayment = async (data: CreatePaymentParams) => {
    const { contract_id, family_user_id, institution_id, amount, method, due_date, notes, payment_items } = data

    // Verify contract exists and is active
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

    if (contract.status !== 'active') {
      throw new ErrorWithStatus({
        message: 'Contract is not active',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Verify family user exists and has access to this contract
    if (contract.family_user_id && contract.family_user_id !== family_user_id) {
      throw new ErrorWithStatus({
        message: 'Family user does not have access to this contract',
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    // Verify institution matches
    if (contract.institution_id !== institution_id) {
      throw new ErrorWithStatus({
        message: 'Institution mismatch',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Calculate total from payment items
    const calculatedTotal = payment_items.reduce((sum, item) => sum + item.total_price, 0)
    if (Math.abs(calculatedTotal - amount) > 0.01) {
      throw new ErrorWithStatus({
        message: 'Payment amount does not match sum of payment items',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Create payment with items
    const payment = await prisma.payment.create({
      data: {
        contract_id,
        family_user_id,
        institution_id,
        payment_number: this.generatePaymentNumber(),
        amount,
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
            period_end: new Date(item.period_end)
          }))
        }
      },
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
        paymentItems: {
          include: {
            package: true
          }
        },
        family_user: {
          include: {
            familyProfile: true
          }
        }
      }
    })

    return payment
  }

  // Generate payment records from contract based on payment frequency
  generatePaymentsFromContract = async (params: GeneratePaymentsFromContractParams) => {
    const { contract_id, start_date, end_date } = params

    const contract = await prisma.contract.findUnique({
      where: { contract_id },
      include: {
        contractServices: {
          include: {
            package: true
          },
          where: {
            status: 'active'
          }
        },
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

    if (!contract.family_user_id) {
      throw new ErrorWithStatus({
        message: 'Contract does not have a family user assigned',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const periodStart = start_date ? new Date(start_date) : new Date(contract.start_date)
    const periodEnd = end_date ? new Date(end_date) : contract.end_date || new Date()

    if (periodStart >= periodEnd) {
      throw new ErrorWithStatus({
        message: 'Start date must be before end date',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const payments: any[] = []

    if (contract.payment_frequency === PaymentFrequency.monthly) {
      // Generate monthly payments
      let currentDate = new Date(periodStart)
      while (currentDate < periodEnd) {
        const monthEnd = new Date(currentDate)
        monthEnd.setMonth(monthEnd.getMonth() + 1)
        if (monthEnd > periodEnd) {
          monthEnd.setTime(periodEnd.getTime())
        }

        // Calculate amount for this period based on contract services
        let periodAmount = 0
        const paymentItems: any[] = []

        for (const contractService of contract.contractServices) {
          const itemAmount = contractService.price_at_signing
          periodAmount += itemAmount

          paymentItems.push({
            package_id: contractService.package_id,
            contract_service_id: contractService.contract_service_id,
            item_name: contractService.package.name,
            quantity: 1,
            unit_price: contractService.price_at_signing,
            total_price: contractService.price_at_signing,
            period_start: new Date(currentDate),
            period_end: new Date(monthEnd)
          })
        }

        if (periodAmount > 0) {
          const dueDate = new Date(monthEnd)
          dueDate.setDate(dueDate.getDate() + 7) // Due date is 7 days after period end

          const payment = await this.createPayment({
            contract_id,
            family_user_id: contract.family_user_id,
            institution_id: contract.institution_id,
            amount: periodAmount,
            method: PaymentMethod.paypal, // Default to PayPal, can be changed later
            due_date: dueDate,
            payment_items: paymentItems
          })

          payments.push(payment)
        }

        currentDate = new Date(monthEnd)
      }
    } else if (contract.payment_frequency === PaymentFrequency.annually) {
      // Generate annual payment
      const periodAmount = contract.total_amount
      const paymentItems: any[] = []

      for (const contractService of contract.contractServices) {
        paymentItems.push({
          package_id: contractService.package_id,
          contract_service_id: contractService.contract_service_id,
          item_name: contractService.package.name,
          quantity: 1,
          unit_price: contractService.price_at_signing,
          total_price: contractService.price_at_signing,
          period_start: new Date(periodStart),
          period_end: new Date(periodEnd)
        })
      }

      const dueDate = new Date(periodEnd)
      dueDate.setDate(dueDate.getDate() + 7)

      const payment = await this.createPayment({
        contract_id,
        family_user_id: contract.family_user_id,
        institution_id: contract.institution_id,
        amount: periodAmount,
        method: PaymentMethod.paypal,
        due_date: dueDate,
        payment_items: paymentItems
      })

      payments.push(payment)
    }

    return payments
  }

  // Initiate PayPal payment - Create PayPal order
  initiatePayPalPayment = async (params: InitiatePayPalPaymentParams) => {
    const { payment_id, return_url, cancel_url } = params

    const payment = await prisma.payment.findUnique({
      where: { payment_id },
      include: {
        paymentItems: {
          include: {
            package: true
          }
        },
        contract: {
          include: {
            resident: true
          }
        }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

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

    try {
      const client = getPayPalClient()
      const ordersApi = new OrdersApi(client)

      // Build PayPal order request
      const request = new OrdersCreateRequest()
      request.prefer('return=representation')
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: payment.payment_number,
            description: `Payment for contract ${payment.contract.contract_number}`,
            amount: {
              currency_code: 'USD',
              value: payment.amount.toFixed(2)
            },
            items: payment.paymentItems.map((item) => ({
              name: item.item_name,
              quantity: item.quantity.toString(),
              unit_amount: {
                currency_code: 'USD',
                value: item.unit_price.toFixed(2)
              }
            }))
          }
        ],
        application_context: {
          brand_name: 'HeLiCare',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: return_url,
          cancel_url: cancel_url
        }
      })

      const response = await ordersApi.ordersCreate(request)

      if (response.statusCode !== 201 || !response.result) {
        throw new Error('Failed to create PayPal order')
      }

      const order = response.result
      const orderId = order.id

      if (!orderId) {
        throw new Error('PayPal order ID not found')
      }

      // Update payment with PayPal order ID
      await prisma.payment.update({
        where: { payment_id },
        data: {
          status: PaymentStatus.processing,
          payment_reference: orderId,
          metadata: {
            paypal_order: order,
            created_at: new Date().toISOString()
          }
        }
      })

      // Find approval URL
      const approvalUrl = order.links?.find((link: any) => link.rel === 'approve')?.href

      return {
        order_id: orderId,
        approval_url: approvalUrl,
        payment_id: payment.payment_id,
        payment_number: payment.payment_number
      }
    } catch (error: any) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { payment_id },
        data: {
          status: PaymentStatus.failed,
          failure_reason: error.message || 'Failed to create PayPal order'
        }
      })

      throw new ErrorWithStatus({
        message: `PayPal payment initiation failed: ${error.message}`,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    }
  }

  // Capture PayPal payment
  capturePayPalPayment = async (params: CapturePayPalPaymentParams) => {
    const { payment_id, order_id } = params

    const payment = await prisma.payment.findUnique({
      where: { payment_id }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (payment.payment_reference !== order_id) {
      throw new ErrorWithStatus({
        message: 'Order ID does not match payment reference',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    if (payment.status !== PaymentStatus.processing) {
      throw new ErrorWithStatus({
        message: 'Payment is not in processing status',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    try {
      const client = getPayPalClient()
      const ordersApi = new OrdersApi(client)

      const request = new OrdersCaptureRequest(order_id)
      request.requestBody({})

      const response = await ordersApi.ordersCapture(request)

      if (response.statusCode !== 201 || !response.result) {
        throw new Error('Failed to capture PayPal payment')
      }

      const capture = response.result
      const captureId = capture.id
      const status = capture.status

      if (status === 'COMPLETED') {
        // Update payment as paid
        await prisma.payment.update({
          where: { payment_id },
          data: {
            status: PaymentStatus.paid,
            paid_at: new Date(),
            payment_reference: captureId || order_id,
            metadata: {
              paypal_capture: capture,
              captured_at: new Date().toISOString()
            }
          }
        })

        return {
          success: true,
          payment_id: payment.payment_id,
          capture_id: captureId,
          status: 'paid'
        }
      } else {
        // Payment not completed
        await prisma.payment.update({
          where: { payment_id },
          data: {
            status: PaymentStatus.failed,
            failure_reason: `PayPal capture status: ${status}`,
            metadata: {
              paypal_capture: capture
            }
          }
        })

        return {
          success: false,
          payment_id: payment.payment_id,
          status: 'failed',
          reason: `PayPal capture status: ${status}`
        }
      }
    } catch (error: any) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { payment_id },
        data: {
          status: PaymentStatus.failed,
          failure_reason: error.message || 'Failed to capture PayPal payment'
        }
      })

      throw new ErrorWithStatus({
        message: `PayPal payment capture failed: ${error.message}`,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    }
  }

  // Process COD payment
  processCODPayment = async (params: ProcessCODPaymentParams) => {
    const { payment_id, notes } = params

    const payment = await prisma.payment.findUnique({
      where: { payment_id }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (payment.method !== PaymentMethod.COD) {
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

    // For COD, we mark it as processing (waiting for cash collection)
    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: {
        status: PaymentStatus.processing,
        notes: notes || payment.notes,
        metadata: {
          cod_processing: true,
          processed_at: new Date().toISOString()
        }
      },
      include: {
        contract: true,
        paymentItems: true
      }
    })

    return updatedPayment
  }

  // Mark COD payment as paid (when cash is collected)
  markCODPaymentAsPaid = async (payment_id: string) => {
    const payment = await prisma.payment.findUnique({
      where: { payment_id }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (payment.method !== PaymentMethod.COD) {
      throw new ErrorWithStatus({
        message: 'Payment method is not COD',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    if (payment.status !== PaymentStatus.processing) {
      throw new ErrorWithStatus({
        message: 'Payment is not in processing status',
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
          cod_collected: true,
          collected_at: new Date().toISOString()
        }
      },
      include: {
        contract: true,
        paymentItems: true
      }
    })

    return updatedPayment
  }

  // Process bank transfer payment
  processBankTransfer = async (params: ProcessBankTransferParams) => {
    const { payment_id, bank_name, account_number, transaction_reference, notes } = params

    const payment = await prisma.payment.findUnique({
      where: { payment_id }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (payment.method !== PaymentMethod.bank_transfer) {
      throw new ErrorWithStatus({
        message: 'Payment method is not bank transfer',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    if (payment.status !== PaymentStatus.pending) {
      throw new ErrorWithStatus({
        message: 'Payment is not in pending status',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Mark as processing (waiting for bank confirmation)
    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: {
        status: PaymentStatus.processing,
        payment_reference: transaction_reference,
        notes: notes || payment.notes,
        metadata: {
          bank_name,
          account_number,
          transaction_reference,
          processed_at: new Date().toISOString()
        }
      },
      include: {
        contract: true,
        paymentItems: true
      }
    })

    return updatedPayment
  }

  // Mark bank transfer as paid (when confirmed)
  markBankTransferAsPaid = async (payment_id: string) => {
    const payment = await prisma.payment.findUnique({
      where: { payment_id }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (payment.method !== PaymentMethod.bank_transfer) {
      throw new ErrorWithStatus({
        message: 'Payment method is not bank transfer',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    if (payment.status !== PaymentStatus.processing) {
      throw new ErrorWithStatus({
        message: 'Payment is not in processing status',
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
          confirmed_at: new Date().toISOString()
        }
      },
      include: {
        contract: true,
        paymentItems: true
      }
    })

    return updatedPayment
  }

  // Process Visa payment
  processVisaPayment = async (params: ProcessVisaPaymentParams) => {
    const { payment_id, card_last_four, transaction_id, notes } = params

    const payment = await prisma.payment.findUnique({
      where: { payment_id }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (payment.method !== PaymentMethod.visa) {
      throw new ErrorWithStatus({
        message: 'Payment method is not Visa',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    if (payment.status !== PaymentStatus.pending) {
      throw new ErrorWithStatus({
        message: 'Payment is not in pending status',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // For Visa, we'll mark it as processing first
    // In a real implementation, you would integrate with a payment gateway
    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: {
        status: PaymentStatus.processing,
        payment_reference: transaction_id,
        notes: notes || payment.notes,
        metadata: {
          card_last_four,
          transaction_id,
          processed_at: new Date().toISOString()
        }
      },
      include: {
        contract: true,
        paymentItems: true
      }
    })

    return updatedPayment
  }

  // Mark Visa payment as paid
  markVisaPaymentAsPaid = async (payment_id: string) => {
    const payment = await prisma.payment.findUnique({
      where: { payment_id }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (payment.method !== PaymentMethod.visa) {
      throw new ErrorWithStatus({
        message: 'Payment method is not Visa',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    if (payment.status !== PaymentStatus.processing) {
      throw new ErrorWithStatus({
        message: 'Payment is not in processing status',
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
          confirmed_at: new Date().toISOString()
        }
      },
      include: {
        contract: true,
        paymentItems: true
      }
    })

    return updatedPayment
  }

  // Get payments with filters
  getPayments = async (params: GetPaymentsParams) => {
    const { contract_id, family_user_id, institution_id, status, method, take, skip } = params

    const where: any = {}

    if (contract_id) where.contract_id = contract_id
    if (family_user_id) where.family_user_id = family_user_id
    if (institution_id) where.institution_id = institution_id
    if (status) where.status = status
    if (method) where.method = method

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
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
          paymentItems: {
            include: {
              package: true
            }
          },
          family_user: {
            include: {
              familyProfile: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        take: take || 50,
        skip: skip || 0
      }),
      prisma.payment.count({ where })
    ])

    return { payments, total }
  }

  // Get payment by ID
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
        paymentItems: {
          include: {
            package: true
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

    return payment
  }

  // Update payment status (admin function)
  updatePaymentStatus = async (params: UpdatePaymentStatusParams) => {
    const { payment_id, status, payment_reference, failure_reason, metadata, paid_at } = params

    const payment = await prisma.payment.findUnique({
      where: { payment_id }
    })

    if (!payment) {
      throw new ErrorWithStatus({
        message: 'Payment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const updateData: any = { status }

    if (payment_reference) updateData.payment_reference = payment_reference
    if (failure_reason) updateData.failure_reason = failure_reason
    if (metadata) updateData.metadata = metadata
    if (paid_at) updateData.paid_at = new Date(paid_at)
    if (status === PaymentStatus.paid && !paid_at) {
      updateData.paid_at = new Date()
    }

    const updatedPayment = await prisma.payment.update({
      where: { payment_id },
      data: updateData,
      include: {
        contract: true,
        paymentItems: true
      }
    })

    return updatedPayment
  }
}

const paymentService = new PaymentService()

export { paymentService, PaymentService }

