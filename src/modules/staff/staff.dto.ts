import { StaffPosition } from '@prisma/client'

export interface CreateStaffForInstitutionDto {
  avatar?: string | null
  email: string
  full_name: string
  phone: string
  hire_date: string
  notes: string
  institution_id: string
  position: StaffPosition
}
