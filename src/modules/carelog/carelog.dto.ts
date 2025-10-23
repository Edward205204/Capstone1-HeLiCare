import { CareLogType, CareTaskStatus, MedicationStatus } from '@prisma/client'

export interface CreateCareLogDto {
  resident_id: string
  activity_id?: string
  schedule_id?: string
  type: CareLogType
  title: string
  description?: string
  start_time: Date
  end_time?: Date

  // Medication specific fields
  medication_name?: string
  dosage?: string
  medication_status?: MedicationStatus

  // Meal specific fields
  meal_type?: string // breakfast, lunch, dinner, snack
  food_items?: string
  quantity?: string

  // Exercise specific fields
  exercise_type?: string
  duration_minutes?: number
  intensity?: string // low, medium, high

  notes?: string
}

export interface UpdateCareLogDto {
  type?: CareLogType
  title?: string
  description?: string
  start_time?: Date
  end_time?: Date
  status?: CareTaskStatus

  // Medication specific fields
  medication_name?: string
  dosage?: string
  medication_status?: MedicationStatus

  // Meal specific fields
  meal_type?: string
  food_items?: string
  quantity?: string

  // Exercise specific fields
  exercise_type?: string
  duration_minutes?: number
  intensity?: string

  notes?: string
}

export interface GetCareLogsQueryParams {
  take?: number
  skip?: number
  resident_id?: string
  staff_id?: string
  type?: CareLogType
  status?: CareTaskStatus
  start_date?: Date
  end_date?: Date
  search?: string
}

export interface CareLogResponse {
  care_log_id: string
  resident_id: string
  staff_id: string
  activity_id?: string
  schedule_id?: string
  institution_id: string
  type: CareLogType
  title: string
  description?: string
  start_time: Date
  end_time?: Date
  status: CareTaskStatus
  medication_name?: string
  dosage?: string
  medication_status?: MedicationStatus
  meal_type?: string
  food_items?: string
  quantity?: string
  exercise_type?: string
  duration_minutes?: number
  intensity?: string
  notes?: string
  created_at: Date
  updated_at: Date
  resident?: {
    resident_id: string
    full_name: string
  }
  staff?: {
    user_id: string
    staffProfile?: {
      full_name: string
      position: string
    }
  }
  activity?: {
    activity_id: string
    name: string
    type: string
  }
  schedule?: {
    schedule_id: string
    title: string
  }
}
