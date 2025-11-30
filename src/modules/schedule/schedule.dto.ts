import { ActivityType, ActivityStatus, ScheduleFrequency } from '@prisma/client'

export interface CreateScheduleDto {
  activity_id: string
  resident_id?: string
  staff_id?: string
  staff_ids?: string[] // For multiple staff assignment
  title: string
  description?: string
  start_time: Date
  end_time: Date
  frequency: ScheduleFrequency
  is_recurring?: boolean
  recurring_until?: Date
  notes?: string
}

export interface UpdateScheduleDto {
  activity_id?: string
  resident_id?: string
  staff_id?: string
  title?: string
  description?: string
  start_time?: Date
  end_time?: Date
  frequency?: ScheduleFrequency
  is_recurring?: boolean
  recurring_until?: Date
  status?: ActivityStatus
  notes?: string
}

export interface GetSchedulesQueryParams {
  take?: number
  skip?: number
  resident_id?: string
  staff_id?: string
  activity_id?: string
  status?: ActivityStatus
  start_date?: Date
  end_date?: Date
  frequency?: ScheduleFrequency
  is_recurring?: boolean
  search?: string
}

export interface ScheduleResponse {
  schedule_id: string
  activity_id: string
  institution_id: string
  resident_id?: string | null
  staff_id?: string | null
  title: string
  description?: string | null
  start_time: Date
  end_time: Date
  frequency: ScheduleFrequency
  is_recurring: boolean
  recurring_until?: Date | null
  status: ActivityStatus
  notes?: string | null
  created_at: Date
  updated_at: Date
  activity?: {
    activity_id: string
    name: string
    type: ActivityType
    duration_minutes?: number | null
  }
  resident?: {
    resident_id: string
    full_name: string
    room_id?: string | null
  } | null
  staff?: {
    user_id: string
    staffProfile?: {
      full_name: string
      position: string
    } | null
  } | null
  institution?: {
    institution_id: string
    name: string
  }
}

export interface ScheduleStatistics {
  total_schedules: number
  active_schedules: number
  completed_schedules: number
  pending_schedules: number
  recurring_schedules: number
  schedules_by_frequency: { frequency: ScheduleFrequency; count: number }[]
  schedules_by_activity_type: { activity_type: ActivityType; count: number }[]
  upcoming_schedules: ScheduleResponse[]
}
