import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'
import { isHandleByStaffValidator } from '~/common/common.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { assessmentController } from './assessment.controller'
import { residentIdValidator } from '../resident/resident.middleware'

const assessmentRouter = Router()

assessmentRouter.post(
  '/create-assessment/:resident_id',
  accessTokenValidator,
  residentIdValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(assessmentController.createAssessment)
)

export default assessmentRouter
