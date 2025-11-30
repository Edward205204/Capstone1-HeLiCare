import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'
import { isHandleByStaffValidator } from '~/common/common.middleware'
import { medicationCarePlanController } from './medication-careplan.controller'
import {
  createMedicationSchema,
  updateMedicationSchema,
  createMedicationCarePlanSchema,
  updateMedicationCarePlanSchema,
  getMedicationsSchema,
  getCarePlansSchema,
  getAlertsSchema,
  getAssignedMedicationsSchema
} from './medication-careplan.schema'

const medicationCarePlanRouter = Router()

// ========== MEDICATION ROUTES ==========

medicationCarePlanRouter.post(
  '/medications',
  accessTokenValidator,
  isHandleByStaffValidator,
  createMedicationSchema,
  medicationCarePlanController.createMedication
)

medicationCarePlanRouter.get(
  '/medications',
  accessTokenValidator,
  isHandleByStaffValidator,
  getMedicationsSchema,
  medicationCarePlanController.getMedications
)

medicationCarePlanRouter.get(
  '/medications/:medication_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  medicationCarePlanController.getMedicationById
)

medicationCarePlanRouter.put(
  '/medications/:medication_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  updateMedicationSchema,
  medicationCarePlanController.updateMedication
)

medicationCarePlanRouter.delete(
  '/medications/:medication_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  medicationCarePlanController.deleteMedication
)

// ========== CARE PLAN ROUTES ==========

medicationCarePlanRouter.post(
  '/care-plans',
  accessTokenValidator,
  isHandleByStaffValidator,
  createMedicationCarePlanSchema,
  medicationCarePlanController.createMedicationCarePlan
)

medicationCarePlanRouter.get(
  '/care-plans',
  accessTokenValidator,
  isHandleByStaffValidator,
  getCarePlansSchema,
  medicationCarePlanController.getCarePlans
)

medicationCarePlanRouter.put(
  '/care-plans/:assignment_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  updateMedicationCarePlanSchema,
  medicationCarePlanController.updateMedicationCarePlan
)

medicationCarePlanRouter.delete(
  '/care-plans/:assignment_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  medicationCarePlanController.deleteMedicationCarePlan
)

// ========== ALERTS & SUMMARY ==========

medicationCarePlanRouter.get(
  '/alerts',
  accessTokenValidator,
  isHandleByStaffValidator,
  getAlertsSchema,
  medicationCarePlanController.getAlerts
)

medicationCarePlanRouter.get(
  '/summary',
  accessTokenValidator,
  isHandleByStaffValidator,
  medicationCarePlanController.getSummary
)

medicationCarePlanRouter.get(
  '/assigned-medications',
  accessTokenValidator,
  isHandleByStaffValidator,
  getAssignedMedicationsSchema,
  medicationCarePlanController.getAssignedMedications
)

export default medicationCarePlanRouter
