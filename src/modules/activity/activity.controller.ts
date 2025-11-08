import { Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { ActivityService, activityService as activityServiceInstance } from './activity.service'
import { CreateActivityDto, UpdateActivityDto, GetActivitiesQueryParams } from './activity.dto'

class ActivityController {
  constructor(private readonly activityService: ActivityService = activityServiceInstance) {}

  // POST Methods
  createActivity = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = req.body as CreateActivityDto

    const activity = await this.activityService.createActivity(institution_id, data)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Activity created successfully',
      data: activity
    })
  }

  // GET Methods
  getActivities = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const query = req.query as unknown as GetActivitiesQueryParams

    const result = await this.activityService.getActivitiesByInstitution(institution_id, query)

    res.status(HTTP_STATUS.OK).json({
      message: 'Activities fetched successfully',
      data: {
        activities: result.data,
        total: result.total,
        take: query.take || 10,
        skip: query.skip || 0
      }
    })
  }

  getActivityById = async (req: Request, res: Response) => {
    const { activity_id } = req.params

    const activity = await this.activityService.getActivityById(activity_id)

    if (!activity) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Activity not found'
      })
      return
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Activity fetched successfully',
      data: activity
    })
  }

  getActivityTypes = async (req: Request, res: Response) => {
    const types = await this.activityService.getActivityTypes()

    res.status(HTTP_STATUS.OK).json({
      message: 'Activity types fetched successfully',
      data: types
    })
  }

  getActivitiesByType = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { type } = req.params

    const activities = await this.activityService.getActivitiesByType(institution_id, type as any)

    res.status(HTTP_STATUS.OK).json({
      message: 'Activities by type fetched successfully',
      data: activities
    })
  }

  getActivityStatistics = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string

    const statistics = await this.activityService.getActivityStatistics(institution_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Activity statistics fetched successfully',
      data: statistics
    })
  }

  // PUT Methods
  updateActivity = async (req: Request, res: Response) => {
    const { activity_id } = req.params
    const data = req.body as UpdateActivityDto

    const activity = await this.activityService.updateActivity(activity_id, data)

    res.status(HTTP_STATUS.OK).json({
      message: 'Activity updated successfully',
      data: activity
    })
  }

  toggleActivityStatus = async (req: Request, res: Response) => {
    const { activity_id } = req.params

    const activity = await this.activityService.toggleActivityStatus(activity_id)

    res.status(HTTP_STATUS.OK).json({
      message: `Activity ${activity.is_active ? 'activated' : 'deactivated'} successfully`,
      data: activity
    })
  }

  // DELETE Methods
  deleteActivity = async (req: Request, res: Response) => {
    const { activity_id } = req.params

    const activity = await this.activityService.deleteActivity(activity_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Activity deleted successfully',
      data: activity
    })
  }
}

const activityController = new ActivityController()

export { activityController, ActivityController }
