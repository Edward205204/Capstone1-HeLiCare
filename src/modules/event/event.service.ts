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
    const initialStatus =
      startTime > now
        ? EventStatus.Upcoming
        : this.calculateStatus(data.start_time, data.end_time, EventStatus.Upcoming)

    const roomIdsToSave = data.room_ids || []
    console.log(`[createEvent] Creating event "${data.name}"`)
    console.log(`[createEvent] room_ids from request:`, data.room_ids)
    console.log(
      `[createEvent] room_ids to save:`,
      roomIdsToSave,
      `(type: ${typeof roomIdsToSave}, isArray: ${Array.isArray(roomIdsToSave)}, length: ${Array.isArray(roomIdsToSave) ? roomIdsToSave.length : 'N/A'})`
    )

    // Create the main event
    const event = await prisma.event.create({
      data: {
        institution_id,
        name: data.name,
        type: data.type,
        start_time: data.start_time,
        end_time: data.end_time,
        location,
        room_ids: roomIdsToSave,
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

    // Build base where condition
    const baseWhere: Prisma.EventWhereInput = {
      institution_id
    }

    // Add date filters
    if (start_date || end_date) {
      baseWhere.start_time = {}
      if (start_date) {
        baseWhere.start_time.gte = new Date(start_date)
      }
      if (end_date) {
        baseWhere.start_time.lte = new Date(end_date)
      }
    }

    // Query all events first, then filter in memory
    // This is necessary because Prisma doesn't support equals: [] for arrays
    const allEvents = await prisma.event.findMany({
      where: baseWhere,
      take: 1000, // Increase limit to get all events
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

    console.log(`[getEventsByRoom] Found ${allEvents.length} total events for institution ${institution_id}`)
    console.log(`[getEventsByRoom] Looking for room_id: ${room_id}`)
    allEvents.forEach((event, idx) => {
      console.log(
        `[getEventsByRoom] Event ${idx + 1}: ${event.name}, room_ids:`,
        event.room_ids,
        `(type: ${typeof event.room_ids}, isArray: ${Array.isArray(event.room_ids)}, length: ${Array.isArray(event.room_ids) ? event.room_ids.length : 'N/A'})`
      )
    })

    // Filter events that apply to this room:
    // 1. Events with empty room_ids array (apply to all rooms)
    // 2. Events with room_ids containing this room_id
    const filteredEvents = allEvents.filter((event) => {
      // Ensure room_ids is an array
      let roomIds = event.room_ids
      if (!roomIds) {
        roomIds = []
      }
      // Handle case where room_ids might be stored as JSON string
      if (typeof roomIds === 'string') {
        try {
          roomIds = JSON.parse(roomIds)
        } catch {
          roomIds = []
        }
      }
      // Ensure it's an array
      if (!Array.isArray(roomIds)) {
        roomIds = []
      }

      // Empty array means apply to all rooms
      if (roomIds.length === 0) {
        console.log(`[getEventsByRoom] Event "${event.name}" applies to all rooms (empty room_ids)`)
        return true
      }
      // Check if room_id is in the array
      const includes = roomIds.includes(room_id)
      if (includes) {
        console.log(`[getEventsByRoom] Event "${event.name}" applies to room ${room_id}`)
      } else {
        console.log(
          `[getEventsByRoom] Event "${event.name}" does NOT apply to room ${room_id} (room_ids: ${JSON.stringify(roomIds)})`
        )
      }
      return includes
    })

    console.log(`[getEventsByRoom] Filtered to ${filteredEvents.length} events for room ${room_id}`)

    // Apply pagination
    const data = filteredEvents.slice(skip, skip + take)
    const total = filteredEvents.length

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

      // Update status in data array
      const updatedEventIds = eventsToUpdate.map(({ id }) => id)
      const updatedEventsMap = new Map(
        (
          await prisma.event.findMany({
            where: {
              event_id: { in: updatedEventIds }
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
        ).map((e) => [e.event_id, e])
      )

      // Update data with new statuses
      data.forEach((event, index) => {
        const updated = updatedEventsMap.get(event.event_id)
        if (updated) {
          data[index] = updated
        }
      })
    }

    return {
      data: data.map((e) => this.mapToEventResponse(e)),
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
