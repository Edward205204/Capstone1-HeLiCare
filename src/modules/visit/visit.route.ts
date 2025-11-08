import { Router } from 'express'
import { visitController } from './visit.controller'
import {
  isHandleByFamily,
  isHandleByAdminOrStaff,
  createVisitValidator,
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

const visitRouter = Router()

visitRouter.post('/visits', accessTokenValidator, isHandleByFamily, createVisitValidator, visitController.createVisit)
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

export default visitRouter
