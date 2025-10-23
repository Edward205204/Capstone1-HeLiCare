import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'
import { isHandleByStaffValidator } from '~/common/common.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { assessmentController } from './assessment.controller'
import { residentIdValidator } from '../resident/resident.middleware'
import {
  createAssessmentSchema,
  updateAssessmentSchema,
  getAssessmentByIdSchema,
  getAssessmentsByResidentSchema,
  getAssessmentsSchema,
  getAssessmentsHistorySchema,
  getAssessmentsQuerySchema,
  deleteAssessmentSchema
} from './assessment.schema'
import { validateRequest } from './assessment.middleware'

const assessmentRouter = Router()

// GET Routes - Lấy dữ liệu assessments
assessmentRouter.get(
  '/get-assessments',
  accessTokenValidator,
  isHandleByStaffValidator,
  getAssessmentsSchema,
  validateRequest,
  wrapRequestHandler(assessmentController.getAssessments)
)

assessmentRouter.get(
  '/get-assessment-by-id/:assessment_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  getAssessmentByIdSchema,
  validateRequest,
  wrapRequestHandler(assessmentController.getAssessmentById)
)

assessmentRouter.get(
  '/get-assessments-by-resident/:resident_id',
  accessTokenValidator,
  residentIdValidator,
  isHandleByStaffValidator,
  getAssessmentsByResidentSchema,
  validateRequest,
  wrapRequestHandler(assessmentController.getAssessmentsByResident)
)

assessmentRouter.get(
  '/get-assessments-history',
  accessTokenValidator,
  isHandleByStaffValidator,
  getAssessmentsHistorySchema,
  validateRequest,
  wrapRequestHandler(assessmentController.getAssessmentsHistory)
)

assessmentRouter.get(
  '/get-assessments-query',
  accessTokenValidator,
  isHandleByStaffValidator,
  getAssessmentsQuerySchema,
  validateRequest,
  wrapRequestHandler(assessmentController.getAssessmentsQuery)
)

// POST Routes - Tạo mới assessments
assessmentRouter.post(
  '/create-assessment/:resident_id',
  accessTokenValidator,
  residentIdValidator,
  isHandleByStaffValidator,
  createAssessmentSchema,
  validateRequest,
  wrapRequestHandler(assessmentController.createAssessment)
)

// PUT Routes - Cập nhật assessments
assessmentRouter.put(
  '/update-assessment/:assessment_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  updateAssessmentSchema,
  validateRequest,
  wrapRequestHandler(assessmentController.updateAssessment)
)

// DELETE Routes - Xóa assessments
assessmentRouter.delete(
  '/delete-assessment/:assessment_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  deleteAssessmentSchema,
  validateRequest,
  wrapRequestHandler(assessmentController.deleteAssessment)
)

export default assessmentRouter
