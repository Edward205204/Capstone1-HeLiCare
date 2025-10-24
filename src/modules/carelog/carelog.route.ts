import { Router } from 'express'
import { careLogController } from './carelog.controller'
import { checkCareLogOwnership, checkCareLogExists, checkResidentAccess, checkStaffAccess } from './carelog.middleware'
import { accessTokenValidator } from '../auth/auth.middleware'

const router = Router()

router.post('/', accessTokenValidator, careLogController.createCareLog)

router.get('/', accessTokenValidator, careLogController.getCareLogs)

router.get('/statistics', accessTokenValidator, careLogController.getCareLogStatistics)

router.get('/resident/:resident_id', accessTokenValidator, checkResidentAccess, careLogController.getCareLogsByResident)

router.get('/staff/:staff_id', accessTokenValidator, checkStaffAccess, careLogController.getCareLogsByStaff)

router.get(
  '/:care_log_id',
  accessTokenValidator,
  checkCareLogExists,
  checkCareLogOwnership,
  careLogController.getCareLogById
)

router.put(
  '/:care_log_id',
  accessTokenValidator,
  checkCareLogExists,
  checkCareLogOwnership,
  careLogController.updateCareLog
)

router.patch(
  '/:care_log_id/status',
  accessTokenValidator,
  checkCareLogExists,
  checkCareLogOwnership,
  careLogController.updateCareLogStatus
)

router.delete(
  '/:care_log_id',
  accessTokenValidator,
  checkCareLogExists,
  checkCareLogOwnership,
  careLogController.deleteCareLog
)

export default router
