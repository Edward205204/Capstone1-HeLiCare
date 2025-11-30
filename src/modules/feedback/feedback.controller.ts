import { Request, Response } from 'express'
import { feedbackService } from './feedback.service'
import { notificationService } from './notification.service'
import { HTTP_STATUS } from '~/constants/http_status'
import { commonService } from '~/common/common.service'
import {
  CreateFeedbackReqBody,
  UpdateFeedbackReqBody,
  GetFeedbacksQuery,
  GetFeedbacksByFamilyQuery,
  CreateNotificationReqBody
} from './feedback.dto'

class FeedbackController {
  // ========== CATEGORY ENDPOINTS ==========

  // GET /categories - Get all categories for institution
  getCategories = async (req: Request, res: Response) => {
    try {
      let institution_id = req.decoded_authorization?.institution_id as string | null
      const user_id = req.decoded_authorization?.user_id as string
      const user_role = req.decoded_authorization?.role as string

      // For family users, get institution_id from resident links if not in token
      if (!institution_id && user_role === 'Family') {
        institution_id = await commonService.getFamilyInstitutionId(user_id)
      }

      if (!institution_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'Institution ID not found. Please link to a resident first.'
        })
        return
      }

      const categories = await feedbackService.getCategories(institution_id)

      res.status(HTTP_STATUS.OK).json({
        message: 'Categories retrieved successfully',
        data: categories
      })
    } catch (error: any) {
      console.error('Error in getCategories:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve categories'
      })
    }
  }

  // ========== FEEDBACK ENDPOINTS ==========

  // POST /feedback - Create feedback (Family)
  createFeedback = async (req: Request, res: Response) => {
    const family_user_id = req.decoded_authorization?.user_id as string
    let institution_id = req.decoded_authorization?.institution_id as string | null
    const user_role = req.decoded_authorization?.role as string
    const feedbackData: CreateFeedbackReqBody = req.body

    // For family users, get institution_id from resident links if not in token
    if (!institution_id && user_role === 'Family') {
      institution_id = await commonService.getFamilyInstitutionId(family_user_id)
    }

    if (!institution_id) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Institution ID not found. Please link to a resident first.'
      })
      return
    }

    try {
      const feedback = await feedbackService.createFeedback(family_user_id, institution_id, feedbackData)

      res.status(HTTP_STATUS.CREATED).json({
        message: 'Feedback submitted successfully',
        data: feedback
      })
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          message: error.message
        })
        return
      }
      throw error
    }
  }

  // GET /feedback - Get feedbacks (Staff view)
  getFeedbacks = async (req: Request, res: Response) => {
    try {
      const institution_id = req.decoded_authorization?.institution_id as string

      if (!institution_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'Institution ID is required'
        })
        return
      }

      const query: GetFeedbacksQuery = {
        category_id: req.query.category_id as string | undefined,
        type: req.query.type as string | undefined,
        status: req.query.status as any,
        resident_id: req.query.resident_id as string | undefined,
        start_date: req.query.start_date as string | undefined,
        end_date: req.query.end_date as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      }

      const result = await feedbackService.getFeedbacks(institution_id, query)

      res.status(HTTP_STATUS.OK).json({
        message: 'Feedbacks retrieved successfully',
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit
      })
    } catch (error: any) {
      console.error('Error in getFeedbacks:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve feedbacks'
      })
    }
  }

  // GET /feedback/:id - Get feedback by ID
  getFeedbackById = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string | undefined
    const user_role = req.decoded_authorization?.role as string
    const user_id = req.decoded_authorization?.user_id as string

    try {
      // For family users, don't require institution_id (they can access via family links)
      const feedback = await feedbackService.getFeedbackById(id, user_role === 'Family' ? undefined : institution_id)

      // For family users, verify they own this feedback
      if (user_role === 'Family' && feedback.family_user_id !== user_id) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          message: 'You do not have access to this feedback'
        })
        return
      }

      res.status(HTTP_STATUS.OK).json({
        message: 'Feedback retrieved successfully',
        data: feedback
      })
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          message: error.message
        })
        return
      }
      throw error
    }
  }

  // GET /feedback/family - Get feedbacks by family (Family view)
  getFeedbacksByFamily = async (req: Request, res: Response) => {
    const family_user_id = req.decoded_authorization?.user_id as string
    const query: GetFeedbacksByFamilyQuery = {
      status: req.query.status as any,
      category_id: req.query.category_id as string | undefined,
      resident_id: req.query.resident_id as string | undefined
    }

    const feedbacks = await feedbackService.getFeedbacksByFamily(family_user_id, query)

    res.status(HTTP_STATUS.OK).json({
      message: 'Feedbacks retrieved successfully',
      data: feedbacks
    })
  }

  // PATCH /feedback/:id - Update feedback (Staff)
  updateFeedback = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const updateData: UpdateFeedbackReqBody = req.body

    if (!institution_id) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Institution ID is required'
      })
      return
    }

    try {
      const feedback = await feedbackService.updateFeedback(id, institution_id, updateData)

      res.status(HTTP_STATUS.OK).json({
        message: 'Feedback updated successfully',
        data: feedback
      })
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          message: error.message
        })
        return
      }
      throw error
    }
  }

  // GET /feedback/stats - Get feedback statistics (Staff)
  getFeedbackStats = async (req: Request, res: Response) => {
    try {
      const institution_id = req.decoded_authorization?.institution_id as string

      if (!institution_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'Institution ID is required'
        })
        return
      }

      const stats = await feedbackService.getFeedbackStats(institution_id)

      res.status(HTTP_STATUS.OK).json({
        message: 'Feedback statistics retrieved successfully',
        data: stats
      })
    } catch (error: any) {
      console.error('Error in getFeedbackStats:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve feedback statistics'
      })
    }
  }

  // POST /notifications - Send notification
  sendNotification = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const notificationData: CreateNotificationReqBody = req.body

    if (!institution_id) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Institution ID is required'
      })
      return
    }

    try {
      await notificationService.sendNotification(institution_id, notificationData)

      res.status(HTTP_STATUS.OK).json({
        message: 'Notification sent successfully'
      })
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json({
          message: error.message
        })
        return
      }
      throw error
    }
  }
}

export const feedbackController = new FeedbackController()
