// Types will be imported from @prisma/client after migration

export interface CreateMedicationDto {
  name: string
  dosage: string
  form: 'tablet' | 'syrup' | 'injection' | 'capsule' | 'liquid' | 'cream' | 'other'
  frequency: string
  timing: 'before_meal' | 'after_meal' | 'with_meal' | 'any_time'
  instructions?: string
}

export interface UpdateMedicationDto {
  name?: string
  dosage?: string
  form?: 'tablet' | 'syrup' | 'injection' | 'capsule' | 'liquid' | 'cream' | 'other'
  frequency?: string
  timing?: 'before_meal' | 'after_meal' | 'with_meal' | 'any_time'
  instructions?: string
  is_active?: boolean
}

export interface CreateMedicationCarePlanDto {
  medication_id: string
  resident_ids?: string[]
  room_ids?: string[]
  staff_ids?: string[]
  start_date: Date
  end_date?: Date
  time_slot?: 'morning' | 'noon' | 'afternoon' | 'evening'
  notes?: string
}

export interface UpdateMedicationCarePlanDto {
  resident_ids?: string[]
  room_ids?: string[]
  staff_ids?: string[]
  start_date?: Date
  end_date?: Date
  time_slot?: 'morning' | 'noon' | 'afternoon' | 'evening'
  is_active?: boolean
  notes?: string
}

export interface GetMedicationsQueryParams {
  take?: number
  skip?: number
  search?: string
  is_active?: boolean
}

export interface GetCarePlansQueryParams {
  take?: number
  skip?: number
  medication_id?: string
  resident_id?: string
  room_id?: string
  staff_id?: string
  is_active?: boolean
}

export interface MedicationResponse {
  medication_id: string
  institution_id: string
  name: string
  dosage: string
  form: string
  frequency: string
  timing: string
  instructions?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
  assignments_count?: number
}

export interface MedicationCarePlanResponse {
  assignment_id: string
  medication_id: string
  institution_id: string
  resident_ids: string[]
  room_ids: string[]
  staff_ids: string[]
  start_date: Date
  end_date?: Date
  time_slot?: string
  is_active: boolean
  notes?: string
  created_at: Date
  updated_at: Date
  medication?: {
    medication_id: string
    name: string
    dosage: string
    form: string
    frequency: string
    timing: string
  }
  residents?: Array<{
    resident_id: string
    full_name: string
    allergies?: Array<{
      id: string
      substance: string
      severity?: string
    }>
    dietTags?: Array<{
      tag_id: string
      tag_type: string
      tag_name: string
    }>
  }>
  rooms?: Array<{
    room_id: string
    room_number: string
    type: string
    capacity: number
  }>
  staff?: Array<{
    user_id: string
    email: string
    staffProfile?: {
      full_name: string
      position: string
    }
  }>
}

export interface AlertResponse {
  type: 'allergy' | 'diet' | 'schedule'
  severity: 'low' | 'medium' | 'high'
  message: string
  resident_id?: string
  resident_name?: string
  medication_id: string
  medication_name: string
  suggestion?: string
}

export interface MedicationCarePlanSummary {
  total_medications: number
  total_assignments: number
  total_conflicts: number
  active_assignments: number
  medications: Array<{
    medication_id: string
    name: string
    dosage: string
    form: string
    frequency: string
    assignments_count: number
    conflicts_count: number
  }>
}

export interface GetAssignedMedicationsQueryParams {
  take?: number
  skip?: number
  medication_id?: string
  resident_id?: string
  room_id?: string
  time_slot?: string
  is_active?: boolean
}

export interface AssignedMedicationResponse {
  assignment_id: string
  medication: {
    medication_id: string
    name: string
    dosage: string
    form: string
    frequency: string
    timing: string
  }
  residents: Array<{
    resident_id: string
    full_name: string
    room?: {
      room_id: string
      room_number: string
    }
    allergies?: Array<{
      id: string
      substance: string
      severity?: string
    }>
    dietTags?: Array<{
      tag_id: string
      tag_type: string
      tag_name: string
    }>
  }>
  rooms: Array<{
    room_id: string
    room_number: string
    type: string
    capacity: number
  }>
  start_date: Date
  end_date?: Date
  time_slot?: string
  is_active: boolean
  notes?: string
  conflicts?: AlertResponse[]
}
