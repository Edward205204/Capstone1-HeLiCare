import { FeedbackStatus } from '@prisma/client'

// Category DTOs
export interface CategoryResponse {
  category_id: string
  institution_id: string
  name: string
  description: string | null
  metadata: {
    types?: string[]
    attachmentsRequired?: boolean
    urgency?: string
    contactMethod?: string
    requiredFields?: string[]
  } | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Create Feedback DTO
export interface CreateFeedbackReqBody {
  resident_id?: string
  category_id: string
  type?: string
  message: string
  attachments?: string[]
}

// Update Feedback DTO (for staff)
export interface UpdateFeedbackReqBody {
  status?: FeedbackStatus
  staff_notes?: string
  assigned_staff_id?: string
  type?: string
}

// Feedback Response DTO
export interface FeedbackResponse {
  feedback_id: string
  family_user_id: string
  resident_id: string | null
  institution_id: string
  category_id: string
  type: string | null
  message: string
  attachments: string[]
  status: FeedbackStatus
  staff_notes: string | null
  assigned_staff_id: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  // Relations
  resident?: {
    resident_id: string
    full_name: string
    room?: {
      room_id: string
      room_number: string
    } | null
    dietTags?: Array<{
      tag_id: string
      tag_type: string
      tag_name: string
    }>
  } | null
  category?: CategoryResponse
  family_user?: {
    email: string
    familyProfile?: {
      full_name: string
    }
  }
  assigned_staff?: {
    user_id: string
    staffProfile?: {
      full_name: string
    }
  } | null
  institution?: {
    name: string
  }
}

// Get Feedbacks Query (for staff)
export interface GetFeedbacksQuery {
  category_id?: string
  type?: string
  status?: FeedbackStatus
  resident_id?: string
  start_date?: string // ISO date string
  end_date?: string // ISO date string
  page?: number
  limit?: number
}

// Get Feedbacks Query (for family)
export interface GetFeedbacksByFamilyQuery {
  status?: FeedbackStatus
  category_id?: string
  resident_id?: string
}

// Notification DTO
export interface CreateNotificationReqBody {
  feedback_id: string
  recipient_type: 'resident' | 'family' | 'staff'
  recipient_id?: string
  message: string
  title: string
}
