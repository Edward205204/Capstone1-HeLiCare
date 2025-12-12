import { Router } from 'express'
import { adminController } from './admin.controller'
import { isHandleByAdmin, isHandleByRootAdmin } from './admin.middleware'
import { accessTokenValidator } from '../auth/auth.middleware'
import { adminLoginValidator } from './admin.schema'
import { wrapRequestHandler } from '~/utils/handler'

const adminRouter = Router()

// ========== AUTH ROUTES ==========
adminRouter.post('/login', adminLoginValidator, wrapRequestHandler(adminController.login))
adminRouter.post('/register', accessTokenValidator, isHandleByRootAdmin, wrapRequestHandler(adminController.register))
adminRouter.get('/me', accessTokenValidator, isHandleByAdmin, wrapRequestHandler(adminController.getMe))

// ========== DASHBOARD ROUTES ==========
adminRouter.get(
  '/dashboard/stats',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.getDashboardStats)
)

// ========== RESIDENTS ROUTES ==========
adminRouter.get('/residents', accessTokenValidator, isHandleByAdmin, wrapRequestHandler(adminController.getResidents))
adminRouter.get(
  '/residents/export',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.exportResidents)
)
adminRouter.post(
  '/residents',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.createResident)
)
adminRouter.put(
  '/residents/:id',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.updateResident)
)
adminRouter.patch(
  '/residents/:id/status',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.updateResidentStatus)
)
adminRouter.delete(
  '/residents/:id',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.deleteResident)
)
adminRouter.get(
  '/residents/:id/audit',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.getResidentAudit)
)
adminRouter.get(
  '/residents/:id/assignments',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.getResidentAssignments)
)

// ========== STAFF/ADMIN ROUTES ==========
adminRouter.get('/staff', accessTokenValidator, isHandleByAdmin, wrapRequestHandler(adminController.getStaff))
adminRouter.get('/staff/export', accessTokenValidator, isHandleByAdmin, wrapRequestHandler(adminController.exportStaff))
adminRouter.post('/staff', accessTokenValidator, isHandleByRootAdmin, wrapRequestHandler(adminController.createAdmin))
adminRouter.put('/staff/:id', accessTokenValidator, isHandleByAdmin, wrapRequestHandler(adminController.updateStaff))
adminRouter.patch(
  '/staff/:id/approve',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.approveStaff)
)
adminRouter.patch(
  '/staff/:id/reject',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.rejectStaff)
)
adminRouter.post(
  '/staff/:id/reset-password',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.resetStaffPassword)
)
adminRouter.post(
  '/staff/:id/assign',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.assignStaffResident)
)
adminRouter.delete(
  '/staff/:id/assign',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.unassignStaffResident)
)
adminRouter.get(
  '/staff/:id/audit',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.getStaffAudit)
)
adminRouter.delete(
  '/staff/:id',
  accessTokenValidator,
  isHandleByRootAdmin,
  wrapRequestHandler(adminController.deleteStaff)
)

// ========== TASKS ROUTES ==========
adminRouter.get('/tasks', accessTokenValidator, isHandleByAdmin, wrapRequestHandler(adminController.getTasks))
adminRouter.post('/tasks', accessTokenValidator, isHandleByAdmin, wrapRequestHandler(adminController.createTask))
adminRouter.put('/tasks/:id', accessTokenValidator, isHandleByAdmin, wrapRequestHandler(adminController.updateTask))
adminRouter.delete('/tasks/:id', accessTokenValidator, isHandleByAdmin, wrapRequestHandler(adminController.deleteTask))

// ========== SETTINGS & AUDIT & ANALYTICS ==========
adminRouter.get('/audit', accessTokenValidator, isHandleByAdmin, wrapRequestHandler(adminController.getAuditLogs))
adminRouter.get('/settings', accessTokenValidator, isHandleByAdmin, wrapRequestHandler(adminController.getSettings))
adminRouter.put('/settings', accessTokenValidator, isHandleByAdmin, wrapRequestHandler(adminController.updateSettings))
adminRouter.get(
  '/analytics/revenue',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.getRevenueAnalytics)
)
adminRouter.get(
  '/analytics/summary',
  accessTokenValidator,
  isHandleByAdmin,
  wrapRequestHandler(adminController.getAnalyticsSummary)
)

export default adminRouter
