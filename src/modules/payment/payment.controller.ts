import { Request, Response } from 'express'
import { paymentService } from './payment.service'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  CreatePaymentReqBody,
  GetPaymentsReqQuery,
  UpdatePaymentStatusReqBody,
  ConfirmCODPaymentReqBody,
  InitiateMomoPaymentReqBody,
  MomoPaymentCallbackQuery
} from './payment.dto'

class PaymentController {
  /**
   * Create a new payment
   */
  createPayment = async (req: Request, res: Response) => {
    const family_user_id = req.decoded_authorization?.user_id as string
    const paymentData: CreatePaymentReqBody = req.body

    const payment = await paymentService.createPayment(family_user_id, paymentData)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Payment created successfully',
      data: payment
    })
  }

  /**
   * Get payments with filters
   */
  getPayments = async (req: Request, res: Response) => {
    const user_id = req.decoded_authorization?.user_id as string
    const user_role = req.decoded_authorization?.role as string
    const institution_id = req.decoded_authorization?.institution_id as string
    const query = req.query as unknown as GetPaymentsReqQuery

    const result = await paymentService.getPayments(user_id, user_role, institution_id, query)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get payments successfully',
      data: result.payments,
      total: result.total
    })
  }

  /**
   * Get payment by ID
   */
  getPaymentById = async (req: Request, res: Response) => {
    const user_id = req.decoded_authorization?.user_id as string
    const user_role = req.decoded_authorization?.role as string
    const { payment_id } = req.params

    const payment = await paymentService.getPaymentById(payment_id, user_id, user_role)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get payment successfully',
      data: payment
    })
  }

  /**
   * Initiate Momo payment
   */
  initiateMomoPayment = async (req: Request, res: Response) => {
    const { payment_id } = req.params
    const { return_url, notify_url } = req.body as InitiateMomoPaymentReqBody

    const result = await paymentService.initiateMomoPayment(payment_id, return_url, notify_url)

    res.status(HTTP_STATUS.OK).json({
      message: 'Momo payment initiated successfully',
      data: result
    })
  }

  /**
   * Handle Momo payment callback
   */
  handleMomoCallback = async (req: Request, res: Response) => {
    const callbackData = req.query as unknown as MomoPaymentCallbackQuery

    const result = await paymentService.handleMomoCallback(callbackData)

    // Momo expects a specific response format
    res.status(HTTP_STATUS.OK).json(result)
  }

  /**
   * Confirm COD payment
   */
  confirmCODPayment = async (req: Request, res: Response) => {
    const { payment_id } = req.params
    const { confirmation_code, notes } = req.body as ConfirmCODPaymentReqBody

    const payment = await paymentService.confirmCODPayment(payment_id, confirmation_code, notes)

    res.status(HTTP_STATUS.OK).json({
      message: 'COD payment confirmed successfully',
      data: payment
    })
  }

  /**
   * Update payment status (for admin/staff)
   */
  updatePaymentStatus = async (req: Request, res: Response) => {
    const { payment_id } = req.params
    const updateData: UpdatePaymentStatusReqBody = req.body

    const payment = await paymentService.updatePaymentStatus(payment_id, updateData)

    res.status(HTTP_STATUS.OK).json({
      message: 'Payment status updated successfully',
      data: payment
    })
  }

  /**
   * Get payments by contract
   */
  getPaymentsByContract = async (req: Request, res: Response) => {
    const user_id = req.decoded_authorization?.user_id as string
    const user_role = req.decoded_authorization?.role as string
    const { contract_id } = req.params

    const payments = await paymentService.getPaymentsByContract(contract_id, user_id, user_role)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get payments by contract successfully',
      data: payments
    })
  }

  /**
   * Generate payment schedule for a contract
   */
  generatePaymentSchedule = async (req: Request, res: Response) => {
    const { contract_id } = req.params
    const { start_date, end_date } = req.query

    if (!start_date || !end_date) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Start date and end date are required'
      })
    }

    const schedule = await paymentService.generatePaymentSchedule(
      contract_id,
      new Date(start_date as string),
      new Date(end_date as string)
    )

    res.status(HTTP_STATUS.OK).json({
      message: 'Payment schedule generated successfully',
      data: schedule
    })
  }
}

const paymentController = new PaymentController()

export { paymentController, PaymentController }

