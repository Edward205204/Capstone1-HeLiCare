import { Router } from 'express'
import { feedbackController } from './feedback.controller'
import {
  isHandleByFamily,
  isHandleByAdminOrStaff,
  createFeedbackValidator,
  updateFeedbackValidator
} from './feedback.middleware'
import { accessTokenValidator } from '../auth/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'

const feedbackRouter = Router()

// ========== CATEGORY ROUTES ==========
// GET /categories - Get categories (available to all authenticated users)
feedbackRouter.get('/categories', accessTokenValidator, wrapRequestHandler(feedbackController.getCategories))

// ========== FEEDBACK ROUTES ==========

// IMPORTANT: Specific routes must come before parameterized routes
// Order matters in Express routing!

// Family routes
// POST /feedback - Create feedback
feedbackRouter.post(
  '/feedback',
  accessTokenValidator,
  isHandleByFamily,
  createFeedbackValidator,
  wrapRequestHandler(feedbackController.createFeedback)
)

// GET /feedback/family - Get feedbacks by family (must come before /feedback/:id)
feedbackRouter.get(
  '/feedback/family',
  accessTokenValidator,
  isHandleByFamily,
  wrapRequestHandler(feedbackController.getFeedbacksByFamily)
)

// Staff/Admin routes
// GET /feedback/stats - Get feedback statistics (must come before /feedback/:id)
feedbackRouter.get(
  '/feedback/stats',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  wrapRequestHandler(feedbackController.getFeedbackStats)
)

// GET /feedback - Get all feedbacks (with filters) (must come before /feedback/:id)
feedbackRouter.get(
  '/feedback',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  wrapRequestHandler(feedbackController.getFeedbacks)
)

// GET /feedback/:id - Get feedback by ID (Family can access their own)
// This must come AFTER all specific routes to avoid matching conflicts
feedbackRouter.get('/feedback/:id', accessTokenValidator, wrapRequestHandler(feedbackController.getFeedbackById))

// PATCH /feedback/:id - Update feedback
feedbackRouter.patch(
  '/feedback/:id',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  updateFeedbackValidator,
  wrapRequestHandler(feedbackController.updateFeedback)
)

// POST /notifications - Send notification
feedbackRouter.post(
  '/notifications',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  wrapRequestHandler(feedbackController.sendNotification)
)

export default feedbackRouter
