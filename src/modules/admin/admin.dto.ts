// Dashboard Stats Response
export interface DashboardStatsResponse {
  total_residents: number
  active_residents: number
  total_staff: number
  active_staff: number
  total_tasks: number
  pending_tasks: number
  completed_tasks: number
  alerts_count: number
  occupancy_rate: number
  total_beds: number
  occupied_beds: number
}

// Resident List Query
export interface GetResidentsQuery {
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'discharged'
  room_id?: string
}

// Create Resident DTO
export interface CreateResidentDto {
  full_name: string
  gender: 'male' | 'female'
  date_of_birth: string
  room_id?: string
  notes?: string
}

// Update Resident DTO
export interface UpdateResidentDto {
  full_name?: string
  gender?: 'male' | 'female'
  date_of_birth?: string
  room_id?: string
  notes?: string
}

// Staff List Query
export interface GetStaffQuery {
  page?: number
  limit?: number
  search?: string
  role?: 'Staff' | 'Admin' | 'RootAdmin'
}

// Create Admin DTO
export interface CreateAdminDto {
  email: string
  institution_id: string
}

// Update Staff DTO
export interface UpdateStaffDto {
  role?: 'Staff' | 'Admin'
  status?: 'active' | 'inactive' | 'pending'
}

export interface UpdateResidentStatusDto {
  status: 'active' | 'inactive' | 'discharged'
}

export interface ExportQuery {
  format?: 'csv' | 'xlsx'
  search?: string
  status?: string
  room_id?: string
  role?: 'Staff' | 'Admin' | 'RootAdmin'
}

export interface ApproveStaffDto {
  approve: boolean
  reason?: string
}

export interface ResetStaffPasswordDto {
  email?: string
}

export interface AssignStaffResidentDto {
  resident_id: string
  role?: string
}

export interface AdminSettingsDto {
  email_templates?: any
  toggles?: any
}

export interface RevenueQuery {
  from?: string
  to?: string
  granularity?: 'day' | 'week' | 'month'
}

// Task List Query
export interface GetTasksQuery {
  page?: number
  limit?: number
  status?: 'pending' | 'in_progress' | 'completed'
  staff_id?: string
}

// Create Task DTO
export interface CreateTaskDto {
  title: string
  description: string
  staff_id: string
  resident_id?: string
  due_date?: string
  priority?: 'low' | 'medium' | 'high'
}

// Update Task DTO
export interface UpdateTaskDto {
  title?: string
  description?: string
  status?: 'pending' | 'in_progress' | 'completed'
  progress?: number
}
