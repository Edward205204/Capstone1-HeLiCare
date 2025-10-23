import { VisitStatus } from '@prisma/client'

export interface CreateVisitReqBody {
  resident_id: string
  visit_date: string // ISO date string
  visit_time: string // Format: "HH:MM"
  duration?: number // Duration in minutes (default 60)
  purpose?: string
  notes?: string
}

export interface UpdateVisitReqBody {
  visit_date?: string
  visit_time?: string
  duration?: number
  purpose?: string
  notes?: string
}

export interface ApproveVisitReqBody {
  status: VisitStatus.approved | VisitStatus.rejected
  notes?: string
}

export interface GetVisitsByDateReqQuery {
  date: string // ISO date string
  institution_id?: string
}

export interface GetVisitsByFamilyReqQuery {
  family_user_id?: string
  status?: VisitStatus
  limit?: number
  offset?: number
}
