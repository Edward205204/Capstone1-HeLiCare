import { Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { CareLogService, careLogService as careLogServiceInstance } from './carelog.service'
import { CreateCareLogDto, UpdateCareLogDto, GetCareLogsQueryParams } from './carelog.dto'
import { CareTaskStatus } from '@prisma/client'

class CareLogController {
  constructor(private readonly careLogService: CareLogService = careLogServiceInstance) {}

  // POST Methods
  createCareLog = async (req: Request, res: Response) => {
    const staff_id = req.decoded_authorization?.user_id as string
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = req.body as CreateCareLogDto

    const careLog = await this.careLogService.createCareLog(staff_id, institution_id, data)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Care log created successfully',
      data: careLog
    })
  }

  // GET Methods
  getCareLogs = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const query = req.query as unknown as GetCareLogsQueryParams

    const result = await this.careLogService.getCareLogsByInstitution(institution_id, query)

    res.status(HTTP_STATUS.OK).json({
      message: 'Care logs fetched successfully',
      data: {
        care_logs: result.data,
        total: result.total,
        take: query.take || 10,
        skip: query.skip || 0
      }
    })
  }

  getCareLogById = async (req: Request, res: Response) => {
    const { care_log_id } = req.params

    const careLog = await this.careLogService.getCareLogById(care_log_id)

    if (!careLog) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Care log not found'
      })
      return
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Care log fetched successfully',
      data: careLog
    })
  }

  getCareLogsByResident = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    const { take, skip } = req.query

    const result = await this.careLogService.getCareLogsByResident(resident_id, Number(take) || 10, Number(skip) || 0)

    res.status(HTTP_STATUS.OK).json({
      message: 'Resident care logs fetched successfully',
      data: {
        care_logs: result.data,
        total: result.total,
        take: Number(take) || 10,
        skip: Number(skip) || 0
      }
    })
  }

  getMealCareLogsByResident = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    const { take, skip, start_date, end_date } = req.query

    const result = await this.careLogService.getMealCareLogsByResident(resident_id, {
      take: Number(take) || undefined,
      skip: Number(skip) || undefined,
      start_date: (start_date as string) || undefined,
      end_date: (end_date as string) || undefined
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Resident meal care logs fetched successfully',
      data: {
        care_logs: result.data,
        total: result.total,
        take: Number(take) || 50,
        skip: Number(skip) || 0
      }
    })
  }

  getCareLogsByStaff = async (req: Request, res: Response) => {
    const { staff_id } = req.params
    const { take, skip } = req.query

    const result = await this.careLogService.getCareLogsByStaff(staff_id, Number(take) || 10, Number(skip) || 0)

    res.status(HTTP_STATUS.OK).json({
      message: 'Staff care logs fetched successfully',
      data: {
        care_logs: result.data,
        total: result.total,
        take: Number(take) || 10,
        skip: Number(skip) || 0
      }
    })
  }

  getCareLogStatistics = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string

    const statistics = await this.careLogService.getCareLogStatistics(institution_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Care log statistics fetched successfully',
      data: statistics
    })
  }

  // PUT Methods
  updateCareLog = async (req: Request, res: Response) => {
    const { care_log_id } = req.params
    const { correction_reason, ...payload } = req.body as UpdateCareLogDto & {
      correction_reason?: string
    }
    const corrected_by_id = req.decoded_authorization?.user_id as string

    const careLog = await this.careLogService.updateCareLog(care_log_id, payload, {
      corrected_by_id,
      correction_reason
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Care log updated successfully',
      data: careLog
    })
  }

  updateCareLogStatus = async (req: Request, res: Response) => {
    const { care_log_id } = req.params
    const { status, correction_reason } = req.body as {
      status: CareTaskStatus
      correction_reason?: string
    }

    if (!Object.values(CareTaskStatus).includes(status)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Invalid care log status'
      })
      return
    }

    const corrected_by_id = req.decoded_authorization?.user_id as string
    const careLog = await this.careLogService.updateCareLogStatus(care_log_id, status, {
      corrected_by_id,
      correction_reason
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Care log status updated successfully',
      data: careLog
    })
  }

  // DELETE Methods
  deleteCareLog = async (req: Request, res: Response) => {
    const { care_log_id } = req.params

    const careLog = await this.careLogService.deleteCareLog(care_log_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Care log deleted successfully',
      data: careLog
    })
  }
}

const careLogController = new CareLogController()

export { careLogController, CareLogController }
