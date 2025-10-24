import { Router } from 'express'
import { scheduleController } from './schedule.controller'
import {
  checkScheduleOwnership,
  checkScheduleExists,
  checkActivityExists,
  checkResidentAccess,
  checkStaffAccess
} from './schedule.middleware'
import { accessTokenValidator } from '~/modules/auth/auth.middleware'

const router = Router()

router.post(
  '/',
  accessTokenValidator,
  checkActivityExists,
  checkResidentAccess,
  checkStaffAccess,
  scheduleController.createSchedule
)

router.get('/', accessTokenValidator, scheduleController.getSchedules)

router.get('/upcoming', accessTokenValidator, scheduleController.getUpcomingSchedules)

router.get('/statistics', accessTokenValidator, scheduleController.getScheduleStatistics)

router.get(
  '/resident/:resident_id',
  accessTokenValidator,
  checkResidentAccess,
  scheduleController.getSchedulesByResident
)

router.get('/staff/:staff_id', accessTokenValidator, checkStaffAccess, scheduleController.getSchedulesByStaff)

router.get(
  '/:schedule_id',
  accessTokenValidator,
  checkScheduleExists,
  checkScheduleOwnership,
  scheduleController.getScheduleById
)

router.put(
  '/:schedule_id',
  accessTokenValidator,
  checkScheduleExists,
  checkScheduleOwnership,
  checkActivityExists,
  checkResidentAccess,
  checkStaffAccess,
  scheduleController.updateSchedule
)

router.patch(
  '/:schedule_id/status',
  accessTokenValidator,
  checkScheduleExists,
  checkScheduleOwnership,
  scheduleController.updateScheduleStatus
)

router.delete(
  '/:schedule_id',
  accessTokenValidator,
  checkScheduleExists,
  checkScheduleOwnership,
  scheduleController.deleteSchedule
)

export default router
