import { Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { EventService, eventService as eventServiceInstance } from './event.service'
import { CreateEventDto, UpdateEventDto, GetEventsQueryParams } from './event.dto'
import { EventType, EventStatus } from '@prisma/client'

class EventController {
  constructor(private readonly eventService: EventService = eventServiceInstance) {}

  // POST Methods
  createEvent = async (req: Request, res: Response) => {
    try {
      const institution_id = req.decoded_authorization?.institution_id as string

      if (!institution_id) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          message: 'Institution ID not found in token'
        })
        return
      }

      const data = req.body as CreateEventDto
      const event = await this.eventService.createEvent(institution_id, data)

      res.status(HTTP_STATUS.CREATED).json({
        message: 'Event created successfully',
        data: event
      })
    } catch (error: any) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: error.message || 'Failed to create event'
      })
    }
  }

  // GET Methods
  getEvents = async (req: Request, res: Response) => {
    try {
      const institution_id = req.decoded_authorization?.institution_id as string

      if (!institution_id) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          message: 'Institution ID not found in token'
        })
        return
      }

      // Parse query parameters - convert strings to numbers
      const query: GetEventsQueryParams = {
        take: req.query.take ? Number(req.query.take) : undefined,
        skip: req.query.skip ? Number(req.query.skip) : undefined,
        type: req.query.type as EventType | undefined,
        status: req.query.status as EventStatus | undefined,
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
        search: req.query.search as string | undefined
      }

      const result = await this.eventService.getEventsByInstitution(institution_id, query)

      const take = query.take || 10
      const skip = query.skip || 0
      const totalPages = Math.max(1, Math.ceil(result.total / take))
      const currentPage = Math.floor(skip / take) + 1

      res.status(HTTP_STATUS.OK).json({
        message: 'Events fetched successfully',
        data: {
          events: result.data,
          total: result.total,
          pagination: {
            page: currentPage,
            limit: take,
            total: result.total,
            totalPages: totalPages
          }
        }
      })
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to fetch events'
      })
    }
  }

  getEventById = async (req: Request, res: Response) => {
    try {
      const { event_id } = req.params
      const event = await this.eventService.getEventById(event_id)

      if (!event) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Event not found'
        })
        return
      }

      res.status(HTTP_STATUS.OK).json({
        message: 'Event fetched successfully',
        data: event
      })
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to fetch event'
      })
    }
  }

  // Get events by room_id (for residents/family)
  getEventsByRoom = async (req: Request, res: Response) => {
    try {
      const institution_id = req.decoded_authorization?.institution_id as string
      const { room_id } = req.query

      if (!institution_id) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          message: 'Institution ID not found in token'
        })
        return
      }

      if (!room_id || typeof room_id !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'Room ID is required'
        })
        return
      }

      // Parse query parameters - convert strings to numbers
      const query: GetEventsQueryParams = {
        take: req.query.take ? Number(req.query.take) : undefined,
        skip: req.query.skip ? Number(req.query.skip) : undefined,
        type: req.query.type as EventType | undefined,
        status: req.query.status as EventStatus | undefined,
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
        search: req.query.search as string | undefined
      }

      const result = await this.eventService.getEventsByRoom(institution_id, room_id, query)

      res.status(HTTP_STATUS.OK).json({
        message: 'Events fetched successfully',
        data: {
          events: result.data,
          total: result.total,
          take: query.take || 100,
          skip: query.skip || 0
        }
      })
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to fetch events'
      })
    }
  }

  // PATCH Methods
  updateEvent = async (req: Request, res: Response) => {
    try {
      const { event_id } = req.params
      const data = req.body as UpdateEventDto

      const event = await this.eventService.updateEvent(event_id, data)

      res.status(HTTP_STATUS.OK).json({
        message: 'Event updated successfully',
        data: event
      })
    } catch (error: any) {
      const status = error.message?.includes('not found')
        ? HTTP_STATUS.NOT_FOUND
        : error.message?.includes('cannot')
          ? HTTP_STATUS.BAD_REQUEST
          : HTTP_STATUS.INTERNAL_SERVER_ERROR

      res.status(status).json({
        message: error.message || 'Failed to update event'
      })
    }
  }

  // DELETE Methods
  deleteEvent = async (req: Request, res: Response) => {
    try {
      const { event_id } = req.params
      await this.eventService.deleteEvent(event_id)

      res.status(HTTP_STATUS.OK).json({
        message: 'Event deleted successfully'
      })
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to delete event'
      })
    }
  }
}

const eventController = new EventController()

export { eventController, EventController }
