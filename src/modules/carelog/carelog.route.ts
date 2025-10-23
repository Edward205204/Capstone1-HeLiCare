import { Router } from 'express'
import { careLogController } from './carelog.controller'
import { 
  createCareLogSchema, 
  updateCareLogSchema, 
  getCareLogByIdSchema, 
  getCareLogsSchema 
} from './carelog.schema'
import { 
  checkCareLogOwnership, 
  checkCareLogExists, 
  checkResidentAccess,
  checkStaffAccess 
} from './carelog.middleware'
import { validate } from '~/utils/validate'
import { accessTokenValidator } from '~/modules/auth/auth.middleware'

const router = Router()

// Apply authentication middleware to all routes
router.use(accessTokenValidator)

// POST /api/carelogs - Create new care log
router.post(
  '/',
  validate(createCareLogSchema),
  careLogController.createCareLog
)

// GET /api/carelogs - Get all care logs with pagination and filters
router.get(
  '/',
  validate(getCareLogsSchema),
  careLogController.getCareLogs
)

// GET /api/carelogs/statistics - Get care log statistics
router.get(
  '/statistics',
  careLogController.getCareLogStatistics
)

// GET /api/carelogs/resident/:resident_id - Get care logs by resident
router.get(
  '/resident/:resident_id',
  checkResidentAccess,
  careLogController.getCareLogsByResident
)

// GET /api/carelogs/staff/:staff_id - Get care logs by staff
router.get(
  '/staff/:staff_id',
  checkStaffAccess,
  careLogController.getCareLogsByStaff
)

// GET /api/carelogs/:care_log_id - Get care log by ID
router.get(
  '/:care_log_id',
  validate(getCareLogByIdSchema),
  checkCareLogExists,
  checkCareLogOwnership,
  careLogController.getCareLogById
)

// PUT /api/carelogs/:care_log_id - Update care log
router.put(
  '/:care_log_id',
  validate(updateCareLogSchema),
  checkCareLogExists,
  checkCareLogOwnership,
  careLogController.updateCareLog
)

// PATCH /api/carelogs/:care_log_id/status - Update care log status
router.patch(
  '/:care_log_id/status',
  validate(getCareLogByIdSchema),
  checkCareLogExists,
  checkCareLogOwnership,
  careLogController.updateCareLogStatus
)

// DELETE /api/carelogs/:care_log_id - Delete care log
router.delete(
  '/:care_log_id',
  validate(getCareLogByIdSchema),
  checkCareLogExists,
  checkCareLogOwnership,
  careLogController.deleteCareLog
)

export default router
