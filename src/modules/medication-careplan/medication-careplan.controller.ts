import { Request, Response } from 'express'
import { medicationCarePlanService } from './medication-careplan.service'
import { HTTP_STATUS } from '~/constants/http_status'

export class MedicationCarePlanController {
  // ========== MEDICATION CRUD ==========

  createMedication = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const medication = await medicationCarePlanService.createMedication(institution_id, req.body)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Medication created successfully',
      data: medication
    })
  }

  getMedications = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const { take, skip, search, is_active } = req.query

    const params = {
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
      search: search as string | undefined,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined
    }

    const result = await medicationCarePlanService.getMedications(institution_id, params)

    res.status(HTTP_STATUS.OK).json({
      message: 'Medications retrieved successfully',
      data: result.data,
      total: result.total
    })
  }

  getMedicationById = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { medication_id } = req.params

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const medication = await medicationCarePlanService.getMedicationById(institution_id, medication_id)

    if (!medication) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Medication not found'
      })
      return
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Medication retrieved successfully',
      data: medication
    })
  }

  updateMedication = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { medication_id } = req.params

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const medication = await medicationCarePlanService.updateMedication(institution_id, medication_id, req.body)

    res.status(HTTP_STATUS.OK).json({
      message: 'Medication updated successfully',
      data: medication
    })
  }

  deleteMedication = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { medication_id } = req.params

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    await medicationCarePlanService.deleteMedication(institution_id, medication_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Medication deleted successfully'
    })
  }

  // ========== CARE PLAN ASSIGNMENTS ==========

  createMedicationCarePlan = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const assignment = await medicationCarePlanService.createMedicationCarePlan(institution_id, req.body)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Medication care plan created successfully',
      data: assignment
    })
  }

  getCarePlans = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const { take, skip, medication_id, resident_id, room_id, staff_id, is_active } = req.query

    const params = {
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
      medication_id: medication_id as string | undefined,
      resident_id: resident_id as string | undefined,
      room_id: room_id as string | undefined,
      staff_id: staff_id as string | undefined,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined
    }

    const result = await medicationCarePlanService.getCarePlans(institution_id, params)

    res.status(HTTP_STATUS.OK).json({
      message: 'Care plans retrieved successfully',
      data: result.data,
      total: result.total
    })
  }

  updateMedicationCarePlan = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { assignment_id } = req.params

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const assignment = await medicationCarePlanService.updateMedicationCarePlan(institution_id, assignment_id, req.body)

    res.status(HTTP_STATUS.OK).json({
      message: 'Care plan updated successfully',
      data: assignment
    })
  }

  deleteMedicationCarePlan = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { assignment_id } = req.params

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    await medicationCarePlanService.deleteMedicationCarePlan(institution_id, assignment_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Care plan deleted successfully'
    })
  }

  // ========== ALERTS ==========

  getAlerts = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { medication_id, resident_ids } = req.query

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const residentIdsArray = resident_ids
      ? ((Array.isArray(resident_ids) ? resident_ids : [resident_ids]) as string[])
      : undefined

    const alerts = await medicationCarePlanService.getAlerts(institution_id, medication_id as string, residentIdsArray)

    res.status(HTTP_STATUS.OK).json({
      message: 'Alerts retrieved successfully',
      data: alerts,
      total: alerts.length
    })
  }

  // ========== SUMMARY ==========

  getSummary = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const summary = await medicationCarePlanService.getSummary(institution_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Summary retrieved successfully',
      data: summary
    })
  }

  // ========== ASSIGNED MEDICATIONS ==========

  getAssignedMedications = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const { take, skip, medication_id, resident_id, room_id, time_slot, is_active } = req.query

    const params = {
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
      medication_id: medication_id as string | undefined,
      resident_id: resident_id as string | undefined,
      room_id: room_id as string | undefined,
      time_slot: time_slot as string | undefined,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined
    }

    const result = await medicationCarePlanService.getAssignedMedications(institution_id, params)

    res.status(HTTP_STATUS.OK).json({
      message: 'Assigned medications retrieved successfully',
      data: result.data,
      total: result.total
    })
  }
}

export const medicationCarePlanController = new MedicationCarePlanController()
