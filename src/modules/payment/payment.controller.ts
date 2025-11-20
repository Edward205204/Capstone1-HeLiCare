import { Request, Response } from 'express'
import { paymentService } from './payment.service'
import { HTTP_STATUS } from '~/constants/http_status'
import { PaymentMethod, PaymentStatus } from '@prisma/client'

class PaymentController {
  constructor() {}

  // GET Methods
  getPayments = async (req: Request, res: Response) => {
    const { user_id, role, institution_id } = req.decoded_authorization as any
    const { contract_id, family_user_id, status, method, take, skip } = req.query

    // Build query params based on user role
    const queryParams: any = {
      contract_id: contract_id as string,
      status: status as PaymentStatus,
      method: method as PaymentMethod,
      take: take ? parseInt(take as string) : undefined,
      skip: skip ? parseInt(skip as string) : undefined
    }

    // Admin/Staff can see all payments in their institution
    if (role === 'Admin' || role === 'Staff' || role === 'RootAdmin') {
      queryParams.institution_id = institution_id
    } else if (role === 'Family') {
      // Family can only see their own payments
      queryParams.family_user_id = user_id
    }

    const result = await paymentService.getPayments(queryParams)

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

  // POST Methods
  createPayment = async (req: Request, res: Response) => {
    const { institution_id, user_id, role } = req.decoded_authorization as any
    const {
      contract_id,
      amount,
      method,
      due_date,
      notes,
      payment_items
    } = req.body

    // Determine family_user_id based on role
    let family_user_id = req.body.family_user_id
    if (role === 'Family') {
      family_user_id = user_id
    }

    const newPayment = await paymentService.createPayment({
      contract_id,
      family_user_id: family_user_id || user_id,
      institution_id,
      amount,
      method,
      due_date,
      notes,
      payment_items
    })

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Create payment successfully',
      data: newPayment
    })
  }

  generatePaymentsFromContract = async (req: Request, res: Response) => {
    const { contract_id } = req.params
    const { start_date, end_date } = req.query

    const payments = await paymentService.generatePaymentsFromContract({
      contract_id,
      start_date: start_date ? new Date(start_date as string) : undefined,
      end_date: end_date ? new Date(end_date as string) : undefined
    })

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Generate payments from contract successfully',
      data: payments,
      count: payments.length
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

  capturePayPalPayment = async (req: Request, res: Response) => {
    const { payment_id } = req.params
    const { order_id } = req.body

    const result = await paymentService.capturePayPalPayment({
      payment_id,
      order_id
    })

    res.status(HTTP_STATUS.OK).json({
      message: result.success ? 'PayPal payment captured successfully' : 'PayPal payment capture failed',
      data: result
    })
  }

  processCODPayment = async (req: Request, res: Response) => {
    const { payment_id } = req.params
    const { notes } = req.body

    const payment = await paymentService.processCODPayment({
      payment_id,
      notes
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'COD payment processed successfully',
      data: payment
    })
  }

  markCODPaymentAsPaid = async (req: Request, res: Response) => {
    const { payment_id } = req.params

    const payment = await paymentService.markCODPaymentAsPaid(payment_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'COD payment marked as paid successfully',
      data: payment
    })
  }

  processBankTransfer = async (req: Request, res: Response) => {
    const { payment_id } = req.params
    const { bank_name, account_number, transaction_reference, notes } = req.body

    const payment = await paymentService.processBankTransfer({
      payment_id,
      bank_name,
      account_number,
      transaction_reference,
      notes
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Bank transfer payment processed successfully',
      data: payment
    })
  }

  markBankTransferAsPaid = async (req: Request, res: Response) => {
    const { payment_id } = req.params

    const payment = await paymentService.markBankTransferAsPaid(payment_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Bank transfer payment marked as paid successfully',
      data: payment
    })
  }

  processVisaPayment = async (req: Request, res: Response) => {
    const { payment_id } = req.params
    const { card_last_four, transaction_id, notes } = req.body

    const payment = await paymentService.processVisaPayment({
      payment_id,
      card_last_four,
      transaction_id,
      notes
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Visa payment processed successfully',
      data: payment
    })
  }

  markVisaPaymentAsPaid = async (req: Request, res: Response) => {
    const { payment_id } = req.params

    const payment = await paymentService.markVisaPaymentAsPaid(payment_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Visa payment marked as paid successfully',
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
      paid_at
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Update payment status successfully',
      data: payment
    })
  }
}

const paymentController = new PaymentController()

export { paymentController, PaymentController }

