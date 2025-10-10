import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'

import { wrapRequestHandler } from '~/utils/handler'
import { residentController } from './resident.controller'
import { getApplicantValidator, residentIdValidator } from './resident.middleware'
import { isHandleByStaffValidator } from '~/common/common.middleware'
const residentRouter = Router()

residentRouter.get(
  '/get-resident',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.getListResident)
)

residentRouter.get(
  '/get-resident-by-id/:resident_id',
  accessTokenValidator,
  residentIdValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.getResidentById)
)

// lấy applicant bằng full name của family
residentRouter.post(
  '/get-applicant-by-family-full-name',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.getApplicantByFamilyFullName)
)

residentRouter.get(
  '/get-applicant',
  accessTokenValidator,
  isHandleByStaffValidator,
  getApplicantValidator,
  wrapRequestHandler(residentController.getApplicant)
)

residentRouter.post(
  '/create-profile-for-resident',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.createProfileForResident)
)

export default residentRouter
