import { EventType, EventStatus, CareSubType, EventFrequency } from '@prisma/client'

export interface CareConfiguration {
  subType: CareSubType
  frequency?: EventFrequency
}

export interface CreateEventDto {
  name: string
  type: EventType
  start_time: Date
  end_time: Date
  location?: string // Default to institution name if not provided
  room_ids?: string[] // Optional for special events
  care_configuration?: CareConfiguration // Only for Care events
}

export interface UpdateEventDto {
  name?: string
  type?: EventType
  start_time?: Date
  end_time?: Date
  location?: string
  room_ids?: string[]
  care_configuration?: CareConfiguration
  status?: EventStatus // Can be set to Cancelled, but Ongoing/Ended are auto-calculated
}

export interface GetEventsQueryParams {
  take?: number
  skip?: number
  type?: EventType
  status?: EventStatus
  start_date?: Date
  end_date?: Date
  search?: string
}

export interface EventResponse {
  event_id: string
  institution_id: string
  name: string
  type: EventType
  status: EventStatus
  start_time: Date
  end_time: Date
  location: string
  room_ids: string[]
  care_configuration?: CareConfiguration | null
  created_at: Date
  updated_at: Date
  institution?: {
    institution_id: string
    name: string
  }
}
