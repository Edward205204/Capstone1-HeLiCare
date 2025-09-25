// Re-export Prisma types để dễ sử dụng
export type {
  User,
  Institution,
  Resident,
  Room,
  UserRole,
  CognitiveStatus,
  MobilityStatus,
  Prisma
} from '../generated/prisma'

// Custom types cho API responses
export type UserResponse = {
  user_id: string
  email: string
  role: UserRole
  institution_id?: string
  created_at: Date
  updated_at: Date
}

export type ResidentResponse = {
  resident_id: string
  name: string
  date_of_birth: Date
  cognitive_status: CognitiveStatus
  mobility_status: MobilityStatus
  room_id?: string
  assigned_staff_id?: string
  admission_date: Date
}
