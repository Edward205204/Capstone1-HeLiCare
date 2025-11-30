import { Router } from 'express'
import { eventController } from './event.controller'
import { checkEventExists, checkEventOwnership } from './event.middleware'
import { accessTokenValidator } from '~/modules/auth/auth.middleware'

const router = Router()

router.post('/', accessTokenValidator, eventController.createEvent)

router.get('/', accessTokenValidator, eventController.getEvents)

router.get('/room', accessTokenValidator, eventController.getEventsByRoom)

router.get('/:event_id', accessTokenValidator, checkEventExists, checkEventOwnership, eventController.getEventById)

router.patch('/:event_id', accessTokenValidator, checkEventExists, checkEventOwnership, eventController.updateEvent)

router.delete('/:event_id', accessTokenValidator, checkEventExists, checkEventOwnership, eventController.deleteEvent)

export default router
