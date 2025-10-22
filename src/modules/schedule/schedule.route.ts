import { Router } from 'express'
import { scheduleController } from './schedule.controller'
// import {
//   createScheduleSchema,
//   updateScheduleSchema,
//   getScheduleByIdSchema,
//   getSchedulesSchema
// } from './schedule.schema'
import {
  checkScheduleOwnership,
  checkScheduleExists,
  checkActivityExists,
  checkResidentAccess,
  checkStaffAccess
} from './schedule.middleware'
import { accessTokenValidator } from '~/modules/auth/auth.middleware'

const router = Router()

// Apply authentication middleware to all routes
router.use(accessTokenValidator)

// POST /api/schedules - Create new schedule
router.post('/', checkActivityExists, checkResidentAccess, checkStaffAccess, scheduleController.createSchedule)

// GET /api/schedules - Get all schedules with pagination and filters
router.get('/', scheduleController.getSchedules)

// GET /api/schedules/upcoming - Get upcoming schedules
router.get('/upcoming', scheduleController.getUpcomingSchedules)

// GET /api/schedules/statistics - Get schedule statistics
router.get('/statistics', scheduleController.getScheduleStatistics)

// GET /api/schedules/resident/:resident_id - Get schedules by resident
router.get('/resident/:resident_id', checkResidentAccess, scheduleController.getSchedulesByResident)

// GET /api/schedules/staff/:staff_id - Get schedules by staff
router.get('/staff/:staff_id', checkStaffAccess, scheduleController.getSchedulesByStaff)

// GET /api/schedules/:schedule_id - Get schedule by ID
router.get('/:schedule_id', checkScheduleExists, checkScheduleOwnership, scheduleController.getScheduleById)

// PUT /api/schedules/:schedule_id - Update schedule
router.put(
  '/:schedule_id',
  checkScheduleExists,
  checkScheduleOwnership,
  checkActivityExists,
  checkResidentAccess,
  checkStaffAccess,
  scheduleController.updateSchedule
)

// PATCH /api/schedules/:schedule_id/status - Update schedule status
router.patch(
  '/:schedule_id/status',
  checkScheduleExists,
  checkScheduleOwnership,
  scheduleController.updateScheduleStatus
)

// DELETE /api/schedules/:schedule_id - Delete schedule
router.delete('/:schedule_id', checkScheduleExists, checkScheduleOwnership, scheduleController.deleteSchedule)

export default router
