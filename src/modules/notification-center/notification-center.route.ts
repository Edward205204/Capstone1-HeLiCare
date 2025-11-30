import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'
import { notificationCenterController } from './notification-center.controller'

const notificationCenterRouter = Router()

notificationCenterRouter.get('/family/last-seen', accessTokenValidator, notificationCenterController.getLastSeen)

notificationCenterRouter.post('/family/mark-all-read', accessTokenValidator, notificationCenterController.markAllRead)

notificationCenterRouter.get('/family/read-ids', accessTokenValidator, notificationCenterController.getReadIds)

notificationCenterRouter.post('/family/mark-read', accessTokenValidator, notificationCenterController.markRead)

export default notificationCenterRouter
