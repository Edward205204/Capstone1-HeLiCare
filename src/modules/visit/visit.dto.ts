import { VisitStatus, VisitTimeBlock } from '@prisma/client'

export interface CreateVisitReqBody {
  resident_id: string
  visit_date: string // ISO date string
  visit_time?: string // Format: "HH:MM" - deprecated, use time_block instead
  time_block?: VisitTimeBlock // Time block: morning, afternoon, evening
  duration?: number // Duration in minutes (default 60)
  purpose?: string
  notes?: string
}

export interface UpdateVisitReqBody {
  visit_date?: string
  visit_time?: string // deprecated, use time_block instead
  time_block?: VisitTimeBlock
  duration?: number
  purpose?: string
  notes?: string
}

export interface ApproveVisitReqBody {
  status: 'approved' | 'rejected'
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

// New DTOs for enhanced visit system
export interface CheckAvailabilityReqQuery {
  institution_id: string
  date: string // ISO date string
}

export interface CheckInReqBody {
  qr_code_data: string
}

export interface CheckOutReqBody {
  visit_id: string
}

export interface CancelVisitReqBody {
  visit_id: string
  reason?: string
}

export interface VisitAvailabilityResponse {
  date: string
  total_visitors: number
  max_visitors_per_day: number
  is_day_available: boolean
  time_blocks: {
    time_block: VisitTimeBlock
    current_visitors: number
    max_visitors: number
    is_available: boolean
  }[]
  suggestions?: {
    date: string
    time_block: VisitTimeBlock
    available_slots: number
  }[]
}

export interface CheckInResponse {
  success: boolean
  visit: {
    visit_id: string
    resident_name: string
    family_name: string
    room_number: string
    check_in_time: Date
  }
}

export interface VisitWithQRCode {
  visit_id: string
  family_user_id: string
  resident_id: string
  institution_id: string
  visit_date: Date
  visit_time?: string
  time_block?: VisitTimeBlock
  duration: number
  purpose?: string
  notes?: string
  status: VisitStatus
  qr_code_data: string
  qr_expires_at: Date
  time_slot?: {
    name: string
    start_time: string
    end_time: string
  }
  created_at: Date
  updated_at: Date
}
