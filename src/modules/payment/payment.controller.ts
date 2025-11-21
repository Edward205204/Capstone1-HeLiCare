import { Request, Response } from 'express'
import { paymentService } from './payment.service'
import { HTTP_STATUS } from '~/constants/http_status'
import { PaymentMethod, PaymentStatus } from '@prisma/client'

class PaymentController {
  constructor() {}

  // GET Methods
  getPayments = async (req: Request, res: Response) => {
    const { institution_id } = req.decoded_authorization as any
    const { contract_id, family_user_id, status, method, take, skip } = req.query

    const result = await paymentService.getPayments({
      institution_id,
      contract_id: contract_id as string,
      family_user_id: family_user_id as string,
      status: status as PaymentStatus,
      method: method as PaymentMethod,
      take: take ? parseInt(take as string) : undefined,
      skip: skip ? parseInt(skip as string) : undefined
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Get payments successfully',
      data: result.payments,
      total: result.total
    })
  }

  getPaymentById = async (req: Request, res: Response) => {
    const { payment_id } = req.params

    const payment = await paymentService.getPaymentById(payment_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get payment successfully',
      data: payment
    })
  }

  calculatePaymentAmount = async (req: Request, res: Response) => {
    const { contract_id } = req.params
    const { period_start, period_end } = req.query

    const result = await paymentService.calculatePaymentAmount(
      contract_id,
      new Date(period_start as string),
      new Date(period_end as string)
    )

    res.status(HTTP_STATUS.OK).json({
      message: 'Calculate payment amount successfully',
      data: result
    })
  }

  // POST Methods
  createPayment = async (req: Request, res: Response) => {
    const { institution_id } = req.decoded_authorization as any
    const { user_id } = req.decoded_authorization as any
    const { contract_id, method, due_date, payment_items, notes } = req.body

    const newPayment = await paymentService.createPayment({
      contract_id,
      family_user_id: user_id,
      institution_id,
      method,
      due_date: new Date(due_date),
      payment_items,
      notes
    })

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Create payment successfully',
      data: newPayment
    })
  }

  initiatePayPalPayment = async (req: Request, res: Response) => {
    const { payment_id } = req.params
    const { return_url, cancel_url } = req.body

    const result = await paymentService.initiatePayPalPayment({
      payment_id,
      return_url,
      cancel_url
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'PayPal payment initiated successfully',
      data: result
    })
  }

  confirmPayPalPayment = async (req: Request, res: Response) => {
    const { payment_id } = req.params
    const { order_id } = req.body

    const result = await paymentService.confirmPayPalPayment(payment_id, order_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'PayPal payment confirmed successfully',
      data: result
    })
  }

  processCODPayment = async (req: Request, res: Response) => {
    const { payment_id } = req.params

    const payment = await paymentService.processCODPayment(payment_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'COD payment processed successfully',
      data: payment
    })
  }

  confirmCODPayment = async (req: Request, res: Response) => {
    const { payment_id } = req.params

    const payment = await paymentService.confirmCODPayment(payment_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'COD payment confirmed successfully',
      data: payment
    })
  }

  processBankTransfer = async (req: Request, res: Response) => {
    const { payment_id } = req.params
    const { bank_name, account_number, account_holder, transfer_reference } = req.body

    const payment = await paymentService.processBankTransfer({
      payment_id,
      bank_name,
      account_number,
      account_holder,
      transfer_reference
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Bank transfer payment processed successfully',
      data: payment
    })
  }

  confirmBankTransfer = async (req: Request, res: Response) => {
    const { payment_id } = req.params

    const payment = await paymentService.confirmBankTransfer(payment_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Bank transfer payment confirmed successfully',
      data: payment
    })
  }

  processVisaPayment = async (req: Request, res: Response) => {
    const { payment_id } = req.params
    const { card_number, card_holder, expiry_date, cvv } = req.body

    const payment = await paymentService.processVisaPayment({
      payment_id,
      card_number,
      card_holder,
      expiry_date,
      cvv
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Visa payment processed successfully',
      data: payment
    })
  }

  // PUT Methods
  updatePaymentStatus = async (req: Request, res: Response) => {
    const { payment_id } = req.params
    const { status, payment_reference, failure_reason, metadata, paid_at } = req.body

    const payment = await paymentService.updatePaymentStatus({
      payment_id,
      status,
      payment_reference,
      failure_reason,
      metadata,
      paid_at: paid_at ? new Date(paid_at) : undefined
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Update payment status successfully',
      data: payment
    })
  }

  cancelPayment = async (req: Request, res: Response) => {
    const { payment_id } = req.params

    const payment = await paymentService.cancelPayment(payment_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Cancel payment successfully',
      data: payment
    })
  }

  // Webhook endpoint (no authentication required, but should verify PayPal signature)
  processPayPalWebhook = async (req: Request, res: Response) => {
    const { event_type, resource } = req.body

    try {
      await paymentService.processPayPalWebhook({
        event_type,
        resource
      })

      res.status(HTTP_STATUS.OK).json({
        message: 'Webhook processed successfully'
      })
    } catch (error: any) {
      console.error('PayPal webhook error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: 'Webhook processing failed',
        error: error.message
      })
    }
  }
}

const paymentController = new PaymentController()

export { paymentController, PaymentController }

