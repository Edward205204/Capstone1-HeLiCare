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

residentRouter.get(
  '/get-applicant',
  accessTokenValidator,
  isHandleByStaffValidator,
  getApplicantValidator,
  wrapRequestHandler(residentController.getApplicant)
)

residentRouter.post('/create-resident', accessTokenValidator, wrapRequestHandler(residentController.createResident))

residentRouter.post(
  '/create-applicant',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.createApplicant)
)

// lấy lịch hẹn đang pending trong ngày hôm nay
residentRouter.get(
  '/get-appointment-pending',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.getAppointmentPending)
)

residentRouter.get(
  '/get-appointment-query',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.getAppointmentQuery)
)

// lấy toàn bộ lịch hẹn thuộc một viện dưỡng lão
residentRouter.get(
  '/get-appointment-history',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.getAppointmentHistory)
)

// thực hiện bởi nhân viên của viện, gửi lên resident id qua body
residentRouter.post(
  '/join-institution',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.joinInstitution)
)

export default residentRouter
