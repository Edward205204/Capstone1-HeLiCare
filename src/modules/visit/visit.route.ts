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

// Tất cả routes đều cần access token
visitRouter.use(accessTokenValidator)

// Routes cho Family
visitRouter.post('/visits', isHandleByFamily, createVisitValidator, visitController.createVisit)
visitRouter.get('/visits', isHandleByFamily, getVisitsByFamilyValidator, visitController.getVisitsByFamily)
visitRouter.get('/visits/:visit_id', visitIdValidator, visitController.getVisitById)
visitRouter.patch('/visits/:visit_id', visitIdValidator, updateVisitValidator, visitController.updateVisit)
visitRouter.delete('/visits/:visit_id', visitIdValidator, visitController.deleteVisit)

// Routes cho Admin/Staff
visitRouter.get('/admin/visits/date', isHandleByAdminOrStaff, getVisitsByDateValidator, visitController.getVisitsByDate)
visitRouter.patch('/admin/visits/:visit_id/approve', isHandleByAdminOrStaff, visitIdValidator, approveVisitValidator, visitController.approveVisit)
visitRouter.get('/admin/visits/stats', isHandleByAdminOrStaff, visitController.getVisitStats)

export default visitRouter
