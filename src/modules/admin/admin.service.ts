import { Prisma, UserRole, UserStatus, CareTaskStatus, ResidentStatus, PaymentStatus } from '@prisma/client'
import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  DashboardStatsResponse,
  GetResidentsQuery,
  CreateResidentDto,
  UpdateResidentDto,
  GetStaffQuery,
  CreateAdminDto,
  UpdateStaffDto,
  GetTasksQuery,
  CreateTaskDto,
  UpdateTaskDto,
  ExportQuery,
  UpdateResidentStatusDto,
  ApproveStaffDto,
  AssignStaffResidentDto,
  AdminSettingsDto,
  RevenueQuery
} from './admin.dto'
import { staffService } from '../staff/staff.service'
import { authService } from '../auth/auth.service'
import { format } from 'date-fns'

class AdminService {
  // ========== DASHBOARD STATS ==========
  getDashboardStats = async (institution_id: string): Promise<DashboardStatsResponse> => {
    const [totalResidents, activeResidents, totalStaff, activeStaff, totalTasks, pendingTasks, completedTasks, rooms] =
      await Promise.all([
        prisma.resident.count({
          where: { institution_id }
        }),
        prisma.resident.count({
          where: { institution_id, admission_date: { not: null } }
        }),
        prisma.user.count({
          where: {
            institution_id,
            role: { in: [UserRole.Staff, UserRole.Admin, UserRole.RootAdmin] }
          }
        }),
        prisma.user.count({
          where: {
            institution_id,
            role: { in: [UserRole.Staff, UserRole.Admin, UserRole.RootAdmin] },
            status: UserStatus.active
          }
        }),
        prisma.careLog.count({
          where: {
            institution_id,
            status: { in: [CareTaskStatus.pending, CareTaskStatus.in_progress, CareTaskStatus.completed] }
          }
        }),
        prisma.careLog.count({
          where: {
            institution_id,
            status: CareTaskStatus.pending
          }
        }),
        prisma.careLog.count({
          where: {
            institution_id,
            status: CareTaskStatus.completed
          }
        }),
        prisma.room.findMany({
          where: { institution_id },
          select: {
            capacity: true,
            current_occupancy: true
          }
        })
      ])

    const totalBeds = rooms.reduce((sum, room) => sum + room.capacity, 0)
    const occupiedBeds = rooms.reduce((sum, room) => sum + room.current_occupancy, 0)
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

    return {
      total_residents: totalResidents,
      active_residents: activeResidents,
      total_staff: totalStaff,
      active_staff: activeStaff,
      total_tasks: totalTasks,
      pending_tasks: pendingTasks,
      completed_tasks: completedTasks,
      // TODO: Replace with actual alert source when model is available
      alerts_count: 0,
      occupancy_rate: occupancyRate,
      total_beds: totalBeds,
      occupied_beds: occupiedBeds
    }
  }

  // ========== RESIDENTS ==========
  getResidents = async (institution_id: string, params: GetResidentsQuery) => {
    const { page, limit, search, status, room_id } = params

    const where: Prisma.ResidentWhereInput = {
      institution_id
    }

    if (search) {
      where.full_name = { contains: search, mode: 'insensitive' }
    }

    if (status) {
      where.status = status as ResidentStatus
    }

    if (room_id) {
      where.room_id = room_id
    }

    const include = {
      room: {
        select: {
          room_id: true,
          room_number: true,
          type: true
        }
      }
    }

    if (!page || !limit) {
      const residents = await prisma.resident.findMany({
        where,
        include,
        orderBy: { full_name: 'asc' }
      })
      return { residents }
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const safePage = Math.max(page, 1)
    const skip = (safePage - 1) * safeLimit

    const [total, residents] = await Promise.all([
      prisma.resident.count({ where }),
      prisma.resident.findMany({
        where,
        include,
        orderBy: { full_name: 'asc' },
        skip,
        take: safeLimit
      })
    ])

    return {
      residents,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
      }
    }
  }

  createResident = async (institution_id: string, data: CreateResidentDto) => {
    const resident = await prisma.resident.create({
      data: {
        ...data,
        institution_id,
        date_of_birth: new Date(data.date_of_birth)
      },
      include: {
        room: {
          select: {
            room_id: true,
            room_number: true,
            type: true
          }
        }
      }
    })
    return resident
  }

  updateResident = async (resident_id: string, institution_id: string, data: UpdateResidentDto) => {
    // Verify resident belongs to institution
    const existing = await prisma.resident.findFirst({
      where: { resident_id, institution_id }
    })

    if (!existing) {
      throw new ErrorWithStatus({
        message: 'Resident not found or does not belong to this institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const updateData: any = { ...data }
    if (data.date_of_birth) {
      updateData.date_of_birth = new Date(data.date_of_birth)
    }

    const resident = await prisma.resident.update({
      where: { resident_id },
      data: updateData,
      include: {
        room: {
          select: {
            room_id: true,
            room_number: true,
            type: true
          }
        }
      }
    })
    return resident
  }

  deleteResident = async (resident_id: string, institution_id: string) => {
    const existing = await prisma.resident.findFirst({
      where: { resident_id, institution_id }
    })

    if (!existing) {
      throw new ErrorWithStatus({
        message: 'Resident not found or does not belong to this institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    await prisma.resident.delete({
      where: { resident_id }
    })
    await this.logAudit(institution_id, existing.assigned_staff_id || null, 'resident', resident_id, 'delete')
  }

  exportResidents = async (institution_id: string, params: GetResidentsQuery & ExportQuery) => {
    try {
      const { format: fmt = 'csv' } = params
      const { residents } = await this.getResidents(institution_id, { ...params, page: undefined, limit: undefined })
      const headers = ['Resident ID', 'Full Name', 'Gender', 'DOB', 'Status', 'Room']
      const rows = residents.map((r) => [
        r.resident_id,
        r.full_name,
        r.gender,
        r.date_of_birth ? format(new Date(r.date_of_birth), 'yyyy-MM-dd') : '',
        (r as any).status || '',
        (r as any).room?.room_number || ''
      ])
      const content = this.toCSV(headers, rows)
      const filename = `residents.${fmt === 'xlsx' ? 'xlsx' : 'csv'}`
      // Trả về CSV cho cả hai format để tránh lỗi thiếu thư viện XLSX
      const contentType = 'text/csv'
      await this.logAudit(institution_id, null, 'resident', null, 'export', { format: fmt })
      return { content, filename, contentType }
    } catch (error) {
      console.error('exportResidents failed', error)
      throw new ErrorWithStatus({ message: 'Export residents failed', status: HTTP_STATUS.INTERNAL_SERVER_ERROR })
    }
  }

  updateResidentStatus = async (resident_id: string, institution_id: string, status: ResidentStatus) => {
    const existing = await prisma.resident.findFirst({
      where: { resident_id, institution_id }
    })

    if (!existing) {
      throw new ErrorWithStatus({
        message: 'Resident not found or does not belong to this institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const resident = await prisma.resident.update({
      where: { resident_id },
      data: { status }
    })
    await this.logAudit(institution_id, null, 'resident', resident_id, 'update_status', { status })
    return resident
  }

  getResidentAssignments = async (resident_id: string, institution_id: string) => {
    const links = await prisma.staffResident.findMany({
      where: { resident_id, institution_id },
      include: {
        staff: {
          select: {
            user_id: true,
            email: true,
            role: true,
            status: true,
            staffProfile: {
              select: {
                full_name: true,
                phone: true,
                position: true
              }
            }
          }
        }
      }
    })
    return links
  }

  // ========== STAFF/ADMIN ==========
  getStaff = async (institution_id: string, params: GetStaffQuery) => {
    const { page, limit, search, role } = params

    const where: Prisma.UserWhereInput = {
      institution_id,
      role: { in: [UserRole.Staff, UserRole.Admin, UserRole.RootAdmin] }
    }

    if (role) {
      where.role = role as UserRole
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { staffProfile: { full_name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    const include = {
      staffProfile: {
        select: {
          full_name: true,
          phone: true,
          position: true,
          avatar: true,
          hire_date: true
        }
      }
    }

    if (!page || !limit) {
      const staff = await prisma.user.findMany({
        where,
        include,
        orderBy: { email: 'asc' }
      })
      return { staff }
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const safePage = Math.max(page, 1)
    const skip = (safePage - 1) * safeLimit

    const [total, staff] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include,
        orderBy: { email: 'asc' },
        skip,
        take: safeLimit
      })
    ])

    return {
      staff,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
      }
    }
  }

  createAdmin = async (creator_institution_id: string, data: CreateAdminDto) => {
    // Only RootAdmin can create Admin
    await staffService.createAdmin({
      email: data.email,
      institution_id: data.institution_id || creator_institution_id
    })
  }

  updateStaff = async (user_id: string, institution_id: string, data: UpdateStaffDto) => {
    const existing = await prisma.user.findFirst({
      where: { user_id, institution_id }
    })

    if (!existing) {
      throw new ErrorWithStatus({
        message: 'Staff not found or does not belong to this institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Prevent changing RootAdmin role
    if (existing.role === UserRole.RootAdmin && data.role) {
      throw new ErrorWithStatus({
        message: 'Cannot change RootAdmin role',
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    const updateData: any = {}
    if (data.role) {
      updateData.role = data.role as UserRole
    }
    if (data.status) {
      updateData.status = data.status as UserStatus
    }

    const user = await prisma.user.update({
      where: { user_id },
      data: updateData,
      include: {
        staffProfile: {
          select: {
            full_name: true,
            phone: true,
            position: true,
            avatar: true,
            hire_date: true
          }
        }
      }
    })
    return user
  }

  deleteStaff = async (user_id: string, institution_id: string) => {
    const existing = await prisma.user.findFirst({
      where: { user_id, institution_id }
    })

    if (!existing) {
      throw new ErrorWithStatus({
        message: 'Staff not found or does not belong to this institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Prevent deleting RootAdmin
    if (existing.role === UserRole.RootAdmin) {
      throw new ErrorWithStatus({
        message: 'Cannot delete RootAdmin',
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    await prisma.user.delete({
      where: { user_id }
    })
  }

  exportStaff = async (institution_id: string, params: GetStaffQuery & ExportQuery) => {
    try {
      const { format: fmt = 'csv' } = params
      const { staff } = await this.getStaff(institution_id, { ...params, page: undefined, limit: undefined })
      const headers = ['User ID', 'Email', 'Full Name', 'Phone', 'Role', 'Status']
      const rows = staff.map((s: any) => [
        s.user_id,
        s.email,
        s.staffProfile?.full_name || '',
        s.staffProfile?.phone || '',
        s.role,
        s.status
      ])
      const content = this.toCSV(headers, rows)
      const filename = `staff.${fmt === 'xlsx' ? 'xlsx' : 'csv'}`
      const contentType = 'text/csv'
      await this.logAudit(institution_id, null, 'staff', null, 'export', { format: fmt })
      return { content, filename, contentType }
    } catch (error) {
      console.error('exportStaff failed', error)
      throw new ErrorWithStatus({ message: 'Export staff failed', status: HTTP_STATUS.INTERNAL_SERVER_ERROR })
    }
  }

  approveStaff = async (user_id: string, institution_id: string) => {
    const existing = await prisma.user.findFirst({
      where: { user_id, institution_id }
    })
    if (!existing) {
      throw new ErrorWithStatus({
        message: 'Staff not found or does not belong to this institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }
    const user = await prisma.user.update({
      where: { user_id },
      data: { status: UserStatus.active }
    })
    await this.logAudit(institution_id, null, 'staff', user_id, 'approve')
    return user
  }

  rejectStaff = async (user_id: string, institution_id: string, reason?: string) => {
    const existing = await prisma.user.findFirst({
      where: { user_id, institution_id }
    })
    if (!existing) {
      throw new ErrorWithStatus({
        message: 'Staff not found or does not belong to this institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }
    const user = await prisma.user.update({
      where: { user_id },
      data: { status: UserStatus.inactive }
    })
    await this.logAudit(institution_id, null, 'staff', user_id, 'reject', { reason })
    return user
  }

  resetStaffPassword = async (user_id: string, institution_id: string) => {
    const user = await prisma.user.findFirst({
      where: { user_id, institution_id }
    })
    if (!user) {
      throw new ErrorWithStatus({
        message: 'Staff not found or does not belong to this institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }
    // Nếu mailer lỗi, không nên trả 500: log và tiếp tục
    try {
      await authService.forgotPassword(user as any)
    } catch (error) {
      console.error('resetStaffPassword mail failed', error)
    }
    await this.logAudit(institution_id, null, 'staff', user_id, 'reset_password')
  }

  assignStaffResident = async (staff_id: string, institution_id: string, body: AssignStaffResidentDto) => {
    const { resident_id, role } = body
    const [staff, resident] = await Promise.all([
      prisma.user.findFirst({ where: { user_id: staff_id, institution_id } }),
      prisma.resident.findFirst({ where: { resident_id, institution_id } })
    ])
    if (!staff || !resident) {
      throw new ErrorWithStatus({
        message: 'Staff or resident not found in institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }
    const link = await prisma.staffResident.upsert({
      where: {
        staff_id_resident_id: { staff_id, resident_id }
      },
      update: { role: role || null },
      create: {
        staff_id,
        resident_id,
        institution_id,
        role: role || null
      },
      include: {
        staff: {
          select: { user_id: true, email: true, role: true, status: true, staffProfile: true }
        }
      }
    })
    await this.logAudit(institution_id, null, 'resident', resident_id, 'assign_staff', { staff_id })
    return link
  }

  unassignStaffResident = async (staff_id: string, institution_id: string, resident_id: string) => {
    await prisma.staffResident.deleteMany({
      where: {
        staff_id,
        resident_id,
        institution_id
      }
    })
    await this.logAudit(institution_id, null, 'resident', resident_id, 'unassign_staff', { staff_id })
  }

  // ========== TASKS ==========
  getTasks = async (institution_id: string, params: GetTasksQuery) => {
    const { page, limit, status, staff_id } = params

    const where: Prisma.CareLogWhereInput = {
      institution_id
    }

    if (status) {
      where.status = status as CareTaskStatus
    }

    if (staff_id) {
      where.staff_id = staff_id
    }

    const include = {
      staff: {
        include: {
          staffProfile: {
            select: {
              full_name: true
            }
          }
        }
      },
      resident: {
        select: {
          resident_id: true,
          full_name: true
        }
      }
    }

    if (!page || !limit) {
      const tasks = await prisma.careLog.findMany({
        where,
        include,
        orderBy: { created_at: 'desc' }
      })
      return { tasks }
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const safePage = Math.max(page, 1)
    const skip = (safePage - 1) * safeLimit

    const [total, tasks] = await Promise.all([
      prisma.careLog.count({ where }),
      prisma.careLog.findMany({
        where,
        include,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit
      })
    ])

    return {
      tasks,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
      }
    }
  }

  createTask = async (institution_id: string, data: CreateTaskDto) => {
    const task = await prisma.careLog.create({
      data: {
        institution_id,
        staff_id: data.staff_id,
        resident_id: data.resident_id || null,
        type: 'custom',
        status: CareTaskStatus.pending,
        notes: data.description,
        created_at: new Date(),
        due_date: data.due_date ? new Date(data.due_date) : null
      },
      include: {
        staff: {
          include: {
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        resident: {
          select: {
            resident_id: true,
            full_name: true
          }
        }
      }
    })
    return task
  }

  updateTask = async (task_id: string, institution_id: string, data: UpdateTaskDto) => {
    const existing = await prisma.careLog.findFirst({
      where: { care_log_id: task_id, institution_id }
    })

    if (!existing) {
      throw new ErrorWithStatus({
        message: 'Task not found or does not belong to this institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const updateData: any = {}
    if (data.status) {
      updateData.status = data.status as CareTaskStatus
    }
    if (data.description) {
      updateData.notes = data.description
    }

    const task = await prisma.careLog.update({
      where: { care_log_id: task_id },
      data: updateData,
      include: {
        staff: {
          include: {
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        resident: {
          select: {
            resident_id: true,
            full_name: true
          }
        }
      }
    })
    return task
  }

  deleteTask = async (task_id: string, institution_id: string) => {
    const existing = await prisma.careLog.findFirst({
      where: { care_log_id: task_id, institution_id }
    })

    if (!existing) {
      throw new ErrorWithStatus({
        message: 'Task not found or does not belong to this institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    await prisma.careLog.delete({
      where: { care_log_id: task_id }
    })
  }

  // ========== AUDIT ==========
  getAuditLogs = async (institution_id: string, params: any) => {
    const { target_type, target_id, action } = params
    const logs = await prisma.auditLog.findMany({
      where: {
        institution_id,
        target_type: target_type as string | undefined,
        target_id: target_id as string | undefined,
        action: action as string | undefined
      },
      orderBy: { created_at: 'desc' },
      take: 200
    })
    return logs
  }

  // ========== SETTINGS ==========
  getSettings = async (institution_id: string) => {
    const setting = await prisma.adminSetting.findUnique({
      where: { institution_id }
    })
    return setting || {}
  }

  updateSettings = async (institution_id: string, body: AdminSettingsDto) => {
    const setting = await prisma.adminSetting.upsert({
      where: { institution_id },
      update: { ...body },
      create: { institution_id, ...body }
    })
    await this.logAudit(institution_id, null, 'setting', institution_id, 'update_setting')
    return setting
  }

  // ========== ANALYTICS ==========
  getRevenueAnalytics = async (institution_id: string, query: RevenueQuery) => {
    const { from, to, granularity = 'month' } = query
    const start = from ? new Date(from) : new Date('2000-01-01')
    const end = to ? new Date(to) : new Date()
    const payments = await prisma.payment.findMany({
      where: {
        contract: { institution_id },
        status: PaymentStatus.SUCCESS,
        created_at: {
          gte: start,
          lte: end
        }
      },
      select: {
        amount: true,
        created_at: true
      }
    })
    const buckets: Record<string, number> = {}
    payments.forEach((p) => {
      const key =
        granularity === 'day'
          ? format(new Date(p.created_at), 'yyyy-MM-dd')
          : granularity === 'week'
            ? format(new Date(p.created_at), "yyyy-'W'II")
            : format(new Date(p.created_at), 'yyyy-MM')
      buckets[key] = (buckets[key] || 0) + p.amount
    })
    const series = Object.entries(buckets)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, value]) => ({ date, value }))
    return { series }
  }

  getAnalyticsSummary = async (institution_id: string) => {
    const [revenue, contracts, unpaid] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { contract: { institution_id }, status: PaymentStatus.SUCCESS }
      }),
      prisma.serviceContract.count({ where: { institution_id, is_active: true } }),
      prisma.payment.count({ where: { contract: { institution_id }, status: PaymentStatus.PENDING } })
    ])
    const total_revenue = revenue._sum.amount || 0
    const mrr = total_revenue / 12
    const arr = mrr * 12
    return {
      total_revenue,
      mrr,
      arr,
      active_contracts: contracts,
      unpaid_invoices: unpaid
    }
  }

  // ========== HELPERS ==========
  private toCSV(headers: string[], rows: any[][]): string {
    const escape = (val: any) => {
      if (val == null) return ''
      const s = String(val)
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const lines = [headers.map(escape).join(',')]
    rows.forEach((r) => lines.push(r.map(escape).join(',')))
    return lines.join('\n')
  }

  private async logAudit(
    institution_id: string,
    actor_id: string | null,
    target_type: string,
    target_id: string | null,
    action: string,
    metadata?: Record<string, any>
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          institution_id,
          actor_id: actor_id || undefined,
          target_type,
          target_id: target_id || undefined,
          action,
          metadata: metadata || undefined
        }
      })
    } catch (error) {
      console.error('Audit log failed', error)
    }
  }
}

export const adminService = new AdminService()
