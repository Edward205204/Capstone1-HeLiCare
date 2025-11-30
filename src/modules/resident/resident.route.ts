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

// update resident
residentRouter.put(
  '/update-resident/:resident_id',
  accessTokenValidator,
  residentIdValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.updateResident)
)

// delete resident
residentRouter.delete(
  '/delete-resident/:resident_id',
  accessTokenValidator,
  residentIdValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.deleteResident)
)

// Lấy danh sách residents của family user (không cần isHandleByStaffValidator)
residentRouter.get(
  '/get-residents-by-family',
  accessTokenValidator,
  wrapRequestHandler(residentController.getResidentsByFamily)
)

// Lấy danh sách người thân liên kết với resident
residentRouter.get(
  '/get-family-members-by-resident/:resident_id',
  accessTokenValidator,
  residentIdValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.getFamilyMembersByResident)
)

// Assign staff to resident
residentRouter.post(
  '/:id/assign-staff',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.assignStaffToResident)
)

// Get staff assigned to resident
residentRouter.get(
  '/:id/staff',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.getResidentStaff)
)

// Get family dashboard data (for family users)
residentRouter.get(
  '/family/dashboard',
  accessTokenValidator,
  wrapRequestHandler(residentController.getFamilyDashboardData)
)

// Get resident dashboard data (for resident users)
residentRouter.get(
  '/resident/dashboard',
  accessTokenValidator,
  wrapRequestHandler(residentController.getResidentDashboardData)
)

// Get resident accounts for password management (staff only)
residentRouter.get(
  '/password-management/accounts',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(residentController.getResidentAccounts)
)

// Staff reset password for resident (sets to inactive - resident must change on first login)
residentRouter.post(
  '/password-management/:resident_id/reset',
  accessTokenValidator,
  isHandleByStaffValidator,
  residentIdValidator,
  wrapRequestHandler(residentController.resetResidentPassword)
)

// Staff change password for resident (sets to active - staff sets new password)
residentRouter.post(
  '/password-management/:resident_id/change',
  accessTokenValidator,
  isHandleByStaffValidator,
  residentIdValidator,
  wrapRequestHandler(residentController.changeResidentPassword)
)

export default residentRouter
