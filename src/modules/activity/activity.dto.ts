import { ActivityType } from '@prisma/client'

export interface CreateActivityDto {
  name: string
  description?: string
  type: ActivityType
  duration_minutes?: number
  max_participants?: number
}

export interface UpdateActivityDto {
  name?: string
  description?: string
  type?: ActivityType
  duration_minutes?: number
  max_participants?: number
  is_active?: boolean
}

export interface GetActivitiesQueryParams {
  take?: number | string
  skip?: number | string
  type?: ActivityType
  is_active?: boolean | string
  search?: string
}

export interface ActivityResponse {
  activity_id: string
  institution_id: string
  name: string
  description?: string
  type: ActivityType
  duration_minutes?: number
  max_participants?: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}
