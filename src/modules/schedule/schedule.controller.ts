import { Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { ScheduleService, scheduleService as scheduleServiceInstance } from './schedule.service'
import { CreateScheduleDto, UpdateScheduleDto, GetSchedulesQueryParams } from './schedule.dto'
import { ActivityStatus } from '@prisma/client'
import { commonService } from '~/common/common.service'

class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService = scheduleServiceInstance) {}

  // POST Methods
  createSchedule = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = req.body as CreateScheduleDto

    // If multiple staff_ids provided, create schedules for each staff
    if (data.staff_ids && data.staff_ids.length > 0) {
      const { staff_ids, ...baseData } = data
      const schedules = await this.scheduleService.createSchedulesForEvent(institution_id, baseData, staff_ids)

      res.status(HTTP_STATUS.CREATED).json({
        message: 'Schedules created successfully',
        data: schedules,
        count: schedules.length
      })
    } else {
      // Single staff assignment (backward compatible)
      const schedule = await this.scheduleService.createSchedule(institution_id, data)

      res.status(HTTP_STATUS.CREATED).json({
        message: 'Schedule created successfully',
        data: schedule
      })
    }
  }

  // GET Methods
  getSchedules = async (req: Request, res: Response) => {
    let institution_id = req.decoded_authorization?.institution_id as string | null
    const user_role = req.decoded_authorization?.role as string
    const user_id = req.decoded_authorization?.user_id as string
    const query = req.query as unknown as GetSchedulesQueryParams

    // For family users, get institution_id from resident links if not in token
    if (!institution_id && user_role === 'Family') {
      institution_id = await commonService.getFamilyInstitutionId(user_id)
    }

    if (!institution_id) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Institution ID not found. Please link to a resident first.'
      })
      return
    }

    const result = await this.scheduleService.getSchedulesByInstitution(institution_id, query)

    res.status(HTTP_STATUS.OK).json({
      message: 'Schedules fetched successfully',
      data: {
        schedules: result.data,
        total: result.total,
        take: query.take || 10,
        skip: query.skip || 0
      }
    })
  }

  getScheduleById = async (req: Request, res: Response) => {
    const { schedule_id } = req.params

    const schedule = await this.scheduleService.getScheduleById(schedule_id)

    if (!schedule) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Schedule not found'
      })
      return
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Schedule fetched successfully',
      data: schedule
    })
  }

  getSchedulesByResident = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    const { take, skip } = req.query

    const result = await this.scheduleService.getSchedulesByResident(resident_id, Number(take) || 10, Number(skip) || 0)

    res.status(HTTP_STATUS.OK).json({
      message: 'Resident schedules fetched successfully',
      data: {
        schedules: result.data,
        total: result.total,
        take: Number(take) || 10,
        skip: Number(skip) || 0
      }
    })
  }

  getSchedulesByStaff = async (req: Request, res: Response) => {
    const { staff_id } = req.params
    const { take, skip } = req.query

    const result = await this.scheduleService.getSchedulesByStaff(staff_id, Number(take) || 10, Number(skip) || 0)

    res.status(HTTP_STATUS.OK).json({
      message: 'Staff schedules fetched successfully',
      data: {
        schedules: result.data,
        total: result.total,
        take: Number(take) || 10,
        skip: Number(skip) || 0
      }
    })
  }

  getUpcomingSchedules = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { days } = req.query

    const schedules = await this.scheduleService.getUpcomingSchedules(institution_id, Number(days) || 7)

    res.status(HTTP_STATUS.OK).json({
      message: 'Upcoming schedules fetched successfully',
      data: schedules
    })
  }

  getScheduleStatistics = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string

    const statistics = await this.scheduleService.getScheduleStatistics(institution_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Schedule statistics fetched successfully',
      data: statistics
    })
  }

  // PUT Methods
  updateSchedule = async (req: Request, res: Response) => {
    const { schedule_id } = req.params
    const data = req.body as UpdateScheduleDto

    const schedule = await this.scheduleService.updateSchedule(schedule_id, data)

    res.status(HTTP_STATUS.OK).json({
      message: 'Schedule updated successfully',
      data: schedule
    })
  }

  updateScheduleStatus = async (req: Request, res: Response) => {
    const { schedule_id } = req.params
    const { status } = req.body

    if (!Object.values(ActivityStatus).includes(status)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Invalid schedule status'
      })
      return
    }

    const schedule = await this.scheduleService.updateScheduleStatus(schedule_id, status)

    res.status(HTTP_STATUS.OK).json({
      message: 'Schedule status updated successfully',
      data: schedule
    })
  }

  // DELETE Methods
  deleteSchedule = async (req: Request, res: Response) => {
    const { schedule_id } = req.params

    const schedule = await this.scheduleService.deleteSchedule(schedule_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Schedule deleted successfully',
      data: schedule
    })
  }
}

const scheduleController = new ScheduleController()

export { scheduleController, ScheduleController }
