import { Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { notificationCenterService } from './notification-center.service'

class NotificationCenterController {
  // GET /api/notifications/family/last-seen
  getLastSeen = async (req: Request, res: Response) => {
    const user_id = req.decoded_authorization?.user_id as string

    const last_seen = await notificationCenterService.getLastSeen(user_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Last seen fetched successfully',
      data: {
        last_seen
      }
    })
  }

  // POST /api/notifications/family/mark-all-read
  markAllRead = async (req: Request, res: Response) => {
    const user_id = req.decoded_authorization?.user_id as string
    const now = new Date()

    const state = await notificationCenterService.markAllAsRead(user_id, now)

    res.status(HTTP_STATUS.OK).json({
      message: 'Notifications marked as read',
      data: {
        last_seen: state.last_seen_at
      }
    })
  }

  // GET /api/notifications/family/read-ids
  getReadIds = async (req: Request, res: Response) => {
    const user_id = req.decoded_authorization?.user_id as string

    const ids = await notificationCenterService.getReadNotificationIds(user_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Read notification ids fetched successfully',
      data: {
        ids
      }
    })
  }

  // POST /api/notifications/family/mark-read
  markRead = async (req: Request, res: Response) => {
    const user_id = req.decoded_authorization?.user_id as string
    const { ids } = req.body as { ids?: string[] }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'ids must be a non-empty array'
      })
      return
    }

    await notificationCenterService.markNotificationsRead(user_id, ids)

    const allIds = await notificationCenterService.getReadNotificationIds(user_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Notifications marked as read',
      data: {
        ids: allIds
      }
    })
  }
}

const notificationCenterController = new NotificationCenterController()

export { notificationCenterController, NotificationCenterController }
