import { TIME_STATUS } from './../../constants/time-status'
import { ResidentAssessmentStatus } from '@prisma/client'

export interface GetAppointmentQueryParams {
  institution_id: string
  take: number
  skip: number
  status?: ResidentAssessmentStatus | 'all'
  time?: (typeof TIME_STATUS)[keyof typeof TIME_STATUS]
  family_user_id?: string
  resident_id?: string
}

export interface GetFamilyDashboardDataResponse {
  resident: {
    resident_id: string
    full_name: string
    gender: string
    date_of_birth: string
    age: number
    room?: {
      room_id: string
      room_number: string
      type: string
    } | null
    institution?: {
      institution_id: string
      name: string
    } | null
    chronicDiseases: Array<{
      id: string
      name: string
      severity?: string | null
    }>
    allergies: Array<{
      id: string
      substance: string
      severity?: string | null
    }>
  }
  latestVisit: {
    visit_id: string
    visit_date: string
    visit_time: string
    status: string
    purpose?: string | null
  } | null
  todaySchedules: Array<{
    schedule_id?: string
    event_id?: string
    title: string
    start_time: string
    end_time: string
    type: string
    status: string
  }>
  latestVitals: {
    assessment_id: string
    measured_at: string
    temperature_c?: number | null
    blood_pressure_systolic?: number | null
    blood_pressure_diastolic?: number | null
    heart_rate?: number | null
    respiratory_rate?: number | null
    oxygen_saturation?: number | null
  } | null
  healthAlerts: Array<{
    id: string
    severity: 'normal' | 'warning' | 'critical'
    message: string
    recommendation: string
  }>
}

export interface GetResidentListParams {
  institution_id: string
  page?: number
  limit?: number
  search?: string
  room_id?: string
}

export interface ResidentListPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ResidentListResponse {
  residents: unknown[]
  pagination?: ResidentListPagination
}
