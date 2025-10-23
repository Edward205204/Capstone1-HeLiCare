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
