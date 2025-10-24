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
  getVisitsByFamilyValidator
} from './visit.middleware'
import { accessTokenValidator } from '../auth/auth.middleware'

const visitRouter = Router()

visitRouter.post('/visits', accessTokenValidator, isHandleByFamily, createVisitValidator, visitController.createVisit)
visitRouter.get(
  '/visits',
  accessTokenValidator,
  isHandleByFamily,
  getVisitsByFamilyValidator,
  visitController.getVisitsByFamily
)
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

export default visitRouter
