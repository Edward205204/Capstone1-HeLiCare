import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'

import { wrapRequestHandler } from '~/utils/handler'
import { residentController } from './resident.controller'
import { isHandleByStaffValidator, residentIdValidator } from './resident.middleware'
const residentRouter = Router()

residentRouter.get(
  '/get-resident',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(wrapRequestHandler(residentController.getListResident))
)

residentRouter.get(
  '/get-resident-by-id/:resident_id',
  accessTokenValidator,
  residentIdValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.getResidentById)
)

residentRouter.get(
  '/get-applicant-by-family-full-name',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.getApplicantByFamilyFullName)
)

residentRouter.post(
  '/create-profile-for-resident',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.createProfileForResident)
)

export default residentRouter
