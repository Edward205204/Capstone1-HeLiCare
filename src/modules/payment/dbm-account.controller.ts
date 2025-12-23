import { Request, Response } from 'express'
import { dbmAccountService } from './dbm-account.service'
import { HTTP_STATUS } from '~/constants/http_status'

class DBMAccountController {
  /**
   * Lấy thông tin tài khoản của user hiện tại
   */
  getMyAccount = async (req: Request, res: Response) => {
    try {
      const user_id = req.decoded_authorization?.user_id as string

      if (!user_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'User ID not found'
        })
        return
      }

      const account = await dbmAccountService.getAccountByUserId(user_id)

      res.status(HTTP_STATUS.OK).json({
        message: 'Account retrieved successfully',
        data: account
      })
    } catch (error: any) {
      console.error('Error in getMyAccount:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve account'
      })
    }
  }

  /**
   * Lấy lịch sử giao dịch của user hiện tại
   */
  getMyTransactionHistory = async (req: Request, res: Response) => {
    try {
      const user_id = req.decoded_authorization?.user_id as string
      const page = req.query.page ? Number(req.query.page) : undefined
      const limit = req.query.limit ? Number(req.query.limit) : undefined

      if (!user_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'User ID not found'
        })
        return
      }

      const result = await dbmAccountService.getTransactionHistory(user_id, page, limit)

      res.status(HTTP_STATUS.OK).json({
        message: 'Transaction history retrieved successfully',
        ...result
      })
    } catch (error: any) {
      console.error('Error in getMyTransactionHistory:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve transaction history'
      })
    }
  }

  /**
   * Lấy thống kê thanh toán cho viện (Admin/Staff)
   */
  getPaymentStatistics = async (req: Request, res: Response) => {
    try {
      const institution_id = req.decoded_authorization?.institution_id as string
      const start_date = req.query.start_date ? new Date(req.query.start_date as string) : undefined
      const end_date = req.query.end_date ? new Date(req.query.end_date as string) : undefined

      if (!institution_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'Institution ID not found'
        })
        return
      }

      const statistics = await dbmAccountService.getPaymentStatistics(institution_id, start_date, end_date)

      res.status(HTTP_STATUS.OK).json({
        message: 'Payment statistics retrieved successfully',
        data: statistics
      })
    } catch (error: any) {
      console.error('Error in getPaymentStatistics:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve payment statistics'
      })
    }
  }

  /**
   * Lấy revenue analytics theo thời gian (để làm chart)
   */
  getRevenueAnalytics = async (req: Request, res: Response) => {
    try {
      const institution_id = req.decoded_authorization?.institution_id as string
      const start_date = req.query.start_date ? new Date(req.query.start_date as string) : undefined
      const end_date = req.query.end_date ? new Date(req.query.end_date as string) : undefined
      const granularity = (req.query.granularity as 'day' | 'week' | 'month') || 'month'

      if (!institution_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'Institution ID not found'
        })
        return
      }

      const analytics = await dbmAccountService.getRevenueAnalytics(institution_id, start_date, end_date, granularity)

      res.status(HTTP_STATUS.OK).json({
        message: 'Revenue analytics retrieved successfully',
        data: analytics
      })
    } catch (error: any) {
      console.error('Error in getRevenueAnalytics:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve revenue analytics'
      })
    }
  }

  /**
   * Lấy revenue theo phương thức thanh toán
   */
  getRevenueByPaymentMethod = async (req: Request, res: Response) => {
    try {
      const institution_id = req.decoded_authorization?.institution_id as string
      const start_date = req.query.start_date ? new Date(req.query.start_date as string) : undefined
      const end_date = req.query.end_date ? new Date(req.query.end_date as string) : undefined

      if (!institution_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'Institution ID not found'
        })
        return
      }

      const revenue = await dbmAccountService.getRevenueByPaymentMethod(institution_id, start_date, end_date)

      res.status(HTTP_STATUS.OK).json({
        message: 'Revenue by payment method retrieved successfully',
        data: revenue
      })
    } catch (error: any) {
      console.error('Error in getRevenueByPaymentMethod:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve revenue by payment method'
      })
    }
  }
}

export const dbmAccountController = new DBMAccountController()
