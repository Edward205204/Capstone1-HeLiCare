import { Router } from 'express'
import { visitController } from './visit.controller'
import {
  isHandleByFamily,
  isHandleByAdminOrStaff,
  createVisitValidator,
  checkTimeOrTimeBlock,
  updateVisitValidator,
  visitIdValidator,
  approveVisitValidator,
  getVisitsByDateValidator,
  getVisitsByFamilyValidator,
  checkAvailabilityValidator,
  checkInValidator,
  checkOutValidator,
  cancelVisitValidator
} from './visit.middleware'
import { accessTokenValidator } from '../auth/auth.middleware'
import { isHandleByResidentValidator } from '~/common/common.middleware'

const visitRouter = Router()

visitRouter.post(
  '/visits',
  accessTokenValidator,
  isHandleByFamily,
  checkTimeOrTimeBlock,
  createVisitValidator,
  visitController.createVisit
)
visitRouter.get('/visits', accessTokenValidator, getVisitsByFamilyValidator, visitController.getVisitsByFamily)
visitRouter.get('/visits/:visit_id', accessTokenValidator, visitIdValidator, visitController.getVisitById)
visitRouter.patch(
  '/visits/:visit_id',
  accessTokenValidator,
  visitIdValidator,
  updateVisitValidator,
  visitController.updateVisit
)
visitRouter.delete('/visits/:visit_id', accessTokenValidator, visitIdValidator, visitController.deleteVisit)

visitRouter.get(
  '/admin/visits/date',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  getVisitsByDateValidator,
  visitController.getVisitsByDate
)
visitRouter.patch(
  '/admin/visits/:visit_id/approve',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  visitIdValidator,
  approveVisitValidator,
  visitController.approveVisit
)
visitRouter.get('/admin/visits/stats', accessTokenValidator, isHandleByAdminOrStaff, visitController.getVisitStats)

visitRouter.get(
  '/visits/availability',
  accessTokenValidator,
  checkAvailabilityValidator,
  visitController.checkAvailability
)
visitRouter.post(
  '/visits/check-in',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  checkInValidator,
  visitController.checkIn
)
visitRouter.post(
  '/visits/check-out',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  checkOutValidator,
  visitController.checkOut
)
visitRouter.post(
  '/visits/cancel',
  accessTokenValidator,
  isHandleByFamily,
  cancelVisitValidator,
  visitController.cancelVisit
)

// Get visits by resident (for Resident role)
visitRouter.get(
  '/resident/visits',
  accessTokenValidator,
  isHandleByResidentValidator,
  visitController.getVisitsByResident
)

export default visitRouter
