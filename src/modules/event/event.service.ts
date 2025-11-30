import { Event, EventType, EventStatus, Prisma } from '@prisma/client'
import { prisma } from '~/utils/db'
import { CreateEventDto, UpdateEventDto, GetEventsQueryParams, EventResponse, CareConfiguration } from './event.dto'

export class EventService {
  /**
   * Calculate event status based on current time
   */
  private calculateStatus(startTime: Date, endTime: Date, currentStatus: EventStatus): EventStatus {
    // If already cancelled, keep it cancelled
    if (currentStatus === EventStatus.Cancelled) {
      return EventStatus.Cancelled
    }

    const now = new Date()
    // Normalize dates to avoid timezone issues
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (now < start) {
      return EventStatus.Upcoming
    } else if (now >= start && now < end) {
      return EventStatus.Ongoing
    } else {
      return EventStatus.Ended
    }
  }

  /**
   * Generate recurring events based on frequency
   */
  private async generateRecurringEvents(
    institution_id: string,
    baseEvent: CreateEventDto,
    frequency: string,
    originalStartTime: Date
  ): Promise<Event[]> {
    if (frequency === 'OneTime' || !frequency) {
      return []
    }

    const events: Event[] = []
    const now = new Date()
    const maxFutureDate = new Date(now)
    maxFutureDate.setMonth(maxFutureDate.getMonth() + 3) // Generate up to 3 months ahead

    const currentStart = new Date(originalStartTime)
    let currentEnd = new Date(baseEvent.end_time)
    const duration = currentEnd.getTime() - currentStart.getTime()

    let count = 0
    const maxCount = 100 // Safety limit

    while (currentStart <= maxFutureDate && count < maxCount) {
      // Skip the original event (already created)
      if (count > 0) {
        const newEvent = await prisma.event.create({
          data: {
            institution_id,
            name: baseEvent.name,
            type: baseEvent.type,
            start_time: new Date(currentStart),
            end_time: new Date(currentEnd),
            location: baseEvent.location || '',
            room_ids: baseEvent.room_ids || [],
            care_configuration: baseEvent.care_configuration
              ? (baseEvent.care_configuration as unknown as Prisma.JsonObject)
              : undefined,
            status: EventStatus.Upcoming
          }
        })
        events.push(newEvent)
      }

      // Calculate next occurrence
      if (frequency === 'Daily') {
        currentStart.setDate(currentStart.getDate() + 1)
        currentEnd = new Date(currentStart.getTime() + duration)
      } else if (frequency === 'Weekly') {
        currentStart.setDate(currentStart.getDate() + 7)
        currentEnd = new Date(currentStart.getTime() + duration)
      } else if (frequency === 'Monthly') {
        currentStart.setMonth(currentStart.getMonth() + 1)
        currentEnd = new Date(currentStart.getTime() + duration)
      } else {
        break
      }

      count++
    }

    return events
  }

  /**
   * Create a new event
   */
  async createEvent(institution_id: string, data: CreateEventDto): Promise<EventResponse> {
    // Get institution name for default location
    const institution = await prisma.institution.findUnique({
      where: { institution_id },
      select: { name: true }
    })

    if (!institution) {
      throw new Error('Institution not found')
    }

    const location = data.location || institution.name

    // Validate care configuration
    if (data.type === EventType.Care && !data.care_configuration) {
      throw new Error('Care configuration is required for Care events')
    }

    if (data.type !== EventType.Care && data.care_configuration) {
      throw new Error('Care configuration should only be provided for Care events')
    }

    // Validate time: end_time must be after start_time
    if (data.end_time <= data.start_time) {
      throw new Error('End time must be after start time')
    }

    // When creating, always start with Upcoming if start_time is in the future
    // Only calculate status if we're checking existing events
    const now = new Date()
    const startTime = new Date(data.start_time)
    const initialStatus = startTime > now ? EventStatus.Upcoming : this.calculateStatus(data.start_time, data.end_time, EventStatus.Upcoming)

    // Create the main event
    const event = await prisma.event.create({
      data: {
        institution_id,
        name: data.name,
        type: data.type,
        start_time: data.start_time,
        end_time: data.end_time,
        location,
        room_ids: data.room_ids || [],
        care_configuration: data.care_configuration
          ? (data.care_configuration as unknown as Prisma.JsonObject)
          : undefined,
        status: initialStatus
      },
      include: {
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        }
      }
    })

    // Generate recurring events if frequency is set
    if (data.care_configuration?.frequency && data.care_configuration.frequency !== 'OneTime') {
      await this.generateRecurringEvents(institution_id, data, data.care_configuration.frequency, data.start_time)
    }

    return this.mapToEventResponse(event)
  }

  /**
   * Get events by room_id (for residents/family to see events in their room)
   */
  async getEventsByRoom(
    institution_id: string,
    room_id: string,
    params: GetEventsQueryParams = {}
  ): Promise<{ data: EventResponse[]; total: number }> {
    const { take = 100, skip = 0, start_date, end_date } = params

    const where: Prisma.EventWhereInput = {
      institution_id,
      room_ids: {
        has: room_id
      }
    }

    if (start_date || end_date) {
      where.start_time = {}
      if (start_date) {
        where.start_time.gte = new Date(start_date)
      }
      if (end_date) {
        where.start_time.lte = new Date(end_date)
      }
    }

    const [data, total] = await Promise.all([
      prisma.event.findMany({
        where,
        take,
        skip,
        orderBy: { start_time: 'asc' },
        include: {
          institution: {
            select: {
              institution_id: true,
              name: true
            }
          }
        }
      }),
      prisma.event.count({ where })
    ])

    // Auto-update status for all fetched events
    const eventsToUpdate: { id: string; newStatus: EventStatus }[] = []

    data.forEach((event) => {
      const calculatedStatus = this.calculateStatus(event.start_time, event.end_time, event.status)
      if (calculatedStatus !== event.status && event.status !== EventStatus.Cancelled) {
        eventsToUpdate.push({ id: event.event_id, newStatus: calculatedStatus })
      }
    })

    // Batch update statuses
    if (eventsToUpdate.length > 0) {
      await Promise.all(
        eventsToUpdate.map(({ id, newStatus }) =>
          prisma.event.update({
            where: { event_id: id },
            data: { status: newStatus }
          })
        )
      )
    }

    // Re-fetch with updated statuses
    const updatedData = await prisma.event.findMany({
      where,
      take,
      skip,
      orderBy: { start_time: 'asc' },
      include: {
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        }
      }
    })

    return {
      data: updatedData.map((e) => this.mapToEventResponse(e)),
      total
    }
  }

  /**
   * Get events by institution with filtering
   */
  async getEventsByInstitution(
    institution_id: string,
    params: GetEventsQueryParams = {}
  ): Promise<{ data: EventResponse[]; total: number }> {
    const { take = 10, skip = 0, type, status, start_date, end_date, search } = params

    const where: Prisma.EventWhereInput = {
      institution_id
    }

    if (type) {
      where.type = type
    }

    if (status) {
      where.status = status
    }

    if (start_date || end_date) {
      where.start_time = {}
      if (start_date) {
        where.start_time.gte = new Date(start_date)
      }
      if (end_date) {
        where.start_time.lte = new Date(end_date)
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ]
    }

    // First, get all events to sort properly
    // We need to sort: Upcoming/Ongoing first (by start_time asc), then Ended (by start_time desc)
    const allEvents = await prisma.event.findMany({
      where,
      include: {
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        }
      }
    })

    const total = allEvents.length

    // Auto-update status for all fetched events
    const eventsToUpdate: { id: string; newStatus: EventStatus }[] = []

    allEvents.forEach((event) => {
      const calculatedStatus = this.calculateStatus(event.start_time, event.end_time, event.status)
      if (calculatedStatus !== event.status && event.status !== EventStatus.Cancelled) {
        eventsToUpdate.push({ id: event.event_id, newStatus: calculatedStatus })
      }
    })

    // Batch update statuses
    if (eventsToUpdate.length > 0) {
      await Promise.all(
        eventsToUpdate.map(({ id, newStatus }) =>
          prisma.event.update({
            where: { event_id: id },
            data: { status: newStatus }
          })
        )
      )
    }

    // Re-fetch with updated statuses
    const updatedEvents = await prisma.event.findMany({
      where: { event_id: { in: allEvents.map((e) => e.event_id) } },
      include: {
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        }
      }
    })

    // Sort events: Upcoming/Ongoing first (ascending by start_time), then Ended (descending by start_time)
    const now = new Date()
    const sortedEvents = updatedEvents.sort((a, b) => {
      const aStatus = this.calculateStatus(a.start_time, a.end_time, a.status)
      const bStatus = this.calculateStatus(b.start_time, b.end_time, b.status)

      // Upcoming and Ongoing come first
      const aIsActive = aStatus === EventStatus.Upcoming || aStatus === EventStatus.Ongoing
      const bIsActive = bStatus === EventStatus.Upcoming || bStatus === EventStatus.Ongoing

      if (aIsActive && !bIsActive) return -1
      if (!aIsActive && bIsActive) return 1

      // Both are active or both are ended
      if (aIsActive && bIsActive) {
        // Sort by start_time ascending
        return a.start_time.getTime() - b.start_time.getTime()
      } else {
        // Both are ended, sort by start_time descending (most recent first)
        return b.start_time.getTime() - a.start_time.getTime()
      }
    })

    // Apply pagination after sorting
    const paginatedEvents = sortedEvents.slice(skip, skip + take)

    return {
      data: paginatedEvents.map((e) => this.mapToEventResponse(e)),
      total
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(event_id: string): Promise<EventResponse | null> {
    const event = await prisma.event.findUnique({
      where: { event_id },
      include: {
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        }
      }
    })

    if (!event) {
      return null
    }

    // Auto-update status
    const calculatedStatus = this.calculateStatus(event.start_time, event.end_time, event.status)
    if (calculatedStatus !== event.status && event.status !== EventStatus.Cancelled) {
      const updated = await prisma.event.update({
        where: { event_id },
        data: { status: calculatedStatus },
        include: {
          institution: {
            select: {
              institution_id: true,
              name: true
            }
          }
        }
      })
      return this.mapToEventResponse(updated)
    }

    return this.mapToEventResponse(event)
  }

  /**
   * Update event
   */
  async updateEvent(event_id: string, data: UpdateEventDto): Promise<EventResponse> {
    const existingEvent = await prisma.event.findUnique({
      where: { event_id }
    })

    if (!existingEvent) {
      throw new Error('Event not found')
    }

    // Validate: Only Upcoming events can be cancelled
    if (data.status === EventStatus.Cancelled && existingEvent.status !== EventStatus.Upcoming) {
      throw new Error('Only Upcoming events can be cancelled')
    }

    // Validate care configuration
    const newType = data.type || existingEvent.type
    if (newType === EventType.Care && data.care_configuration === null) {
      throw new Error('Care configuration cannot be removed from Care events')
    }

    if (newType !== EventType.Care && data.care_configuration) {
      throw new Error('Care configuration should only be provided for Care events')
    }

    // Calculate new status
    const newStartTime = data.start_time || existingEvent.start_time
    const newEndTime = data.end_time || existingEvent.end_time

    // If status is explicitly set to Cancelled, use it; otherwise auto-calculate
    const finalStatus =
      data.status === EventStatus.Cancelled
        ? EventStatus.Cancelled
        : data.status || this.calculateStatus(newStartTime, newEndTime, existingEvent.status)

    const updated = await prisma.event.update({
      where: { event_id },
      data: {
        ...data,
        status: finalStatus,
        care_configuration: data.care_configuration
          ? (data.care_configuration as unknown as Prisma.JsonObject)
          : undefined
      },
      include: {
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        }
      }
    })

    return this.mapToEventResponse(updated)
  }

  /**
   * Delete event
   */
  async deleteEvent(event_id: string): Promise<Event> {
    return await prisma.event.delete({
      where: { event_id }
    })
  }

  /**
   * Map Prisma Event to EventResponse
   */
  private mapToEventResponse(event: any): EventResponse {
    return {
      event_id: event.event_id,
      institution_id: event.institution_id,
      name: event.name,
      type: event.type,
      status: event.status,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      room_ids: event.room_ids,
      care_configuration: event.care_configuration as CareConfiguration | null,
      created_at: event.created_at,
      updated_at: event.updated_at,
      institution: event.institution
    }
  }
}

export const eventService = new EventService()
