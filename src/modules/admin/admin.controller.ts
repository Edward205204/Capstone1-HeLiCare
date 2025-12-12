import { Request, Response } from 'express'
import { adminService } from './admin.service'
import { authService } from '../auth/auth.service'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  GetResidentsQuery,
  CreateResidentDto,
  UpdateResidentDto,
  GetStaffQuery,
  CreateAdminDto,
  UpdateStaffDto,
  GetTasksQuery,
  CreateTaskDto,
  UpdateTaskDto,
  UpdateResidentStatusDto,
  ExportQuery,
  ApproveStaffDto,
  AssignStaffResidentDto,
  AdminSettingsDto,
  RevenueQuery
} from './admin.dto'
import { commonService } from '~/common/common.service'
import { User } from '@prisma/client'

class AdminController {
  // ========== AUTH ==========
  login = async (req: Request, res: Response) => {
    const user = req.user as User
    const data = await authService.login({
      role: user.role,
      institution_id: user.institution_id,
      user_id: user.user_id,
      status: user.status
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Login successfully',
      data
    })
  }

  register = async (req: Request, res: Response) => {
    // Only RootAdmin can create Admin
    const { email, password, institution_id } = req.body
    await adminService.createAdmin(req.decoded_authorization?.institution_id || '', {
      email,
      institution_id: institution_id || req.decoded_authorization?.institution_id || ''
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Admin created successfully'
    })
  }

  getMe = async (req: Request, res: Response) => {
    const user_id = req.decoded_authorization?.user_id as string
    const user = await commonService.getUserById(user_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'User info retrieved successfully',
      data: user
    })
  }

  // ========== DASHBOARD ==========
  getDashboardStats = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const stats = await adminService.getDashboardStats(institution_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Dashboard stats retrieved successfully',
      data: stats
    })
  }

  // ========== RESIDENTS ==========
  getResidents = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const query = req.query as unknown as GetResidentsQuery
    const result = await adminService.getResidents(institution_id, query)

    res.status(HTTP_STATUS.OK).json({
      message: 'Residents retrieved successfully',
      ...result
    })
  }

  exportResidents = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const query = req.query as unknown as GetResidentsQuery & ExportQuery
    const { content, filename, contentType } = await adminService.exportResidents(institution_id, query)
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.status(HTTP_STATUS.OK).send(content)
  }

  createResident = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = req.body as CreateResidentDto
    const resident = await adminService.createResident(institution_id, data)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Resident created successfully',
      data: resident
    })
  }

  updateResident = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = req.body as UpdateResidentDto
    const resident = await adminService.updateResident(id, institution_id, data)

    res.status(HTTP_STATUS.OK).json({
      message: 'Resident updated successfully',
      data: resident
    })
  }

  updateResidentStatus = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = req.body as UpdateResidentStatusDto
    const resident = await adminService.updateResidentStatus(id, institution_id, data.status)

    res.status(HTTP_STATUS.OK).json({
      message: 'Resident status updated successfully',
      data: resident
    })
  }

  deleteResident = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    await adminService.deleteResident(id, institution_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Resident deleted successfully'
    })
  }

  getResidentAudit = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const logs = await adminService.getAuditLogs(institution_id, { target_type: 'resident', target_id: id })

    res.status(HTTP_STATUS.OK).json({
      message: 'Resident audit logs retrieved successfully',
      data: logs
    })
  }

  getResidentAssignments = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await adminService.getResidentAssignments(id, institution_id)
    res.status(HTTP_STATUS.OK).json({
      message: 'Resident assignments retrieved successfully',
      data
    })
  }

  // ========== STAFF/ADMIN ==========
  getStaff = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const query = req.query as unknown as GetStaffQuery
    const result = await adminService.getStaff(institution_id, query)

    res.status(HTTP_STATUS.OK).json({
      message: 'Staff retrieved successfully',
      ...result
    })
  }

  exportStaff = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const query = req.query as unknown as GetStaffQuery & ExportQuery
    const { content, filename, contentType } = await adminService.exportStaff(institution_id, query)
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.status(HTTP_STATUS.OK).send(content)
  }

  createAdmin = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = req.body as CreateAdminDto
    await adminService.createAdmin(institution_id, data)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Admin created successfully'
    })
  }

  updateStaff = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = req.body as UpdateStaffDto
    const staff = await adminService.updateStaff(id, institution_id, data)

    res.status(HTTP_STATUS.OK).json({
      message: 'Staff updated successfully',
      data: staff
    })
  }

  approveStaff = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const staff = await adminService.approveStaff(id, institution_id)
    res.status(HTTP_STATUS.OK).json({
      message: 'Staff approved successfully',
      data: staff
    })
  }

  rejectStaff = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const { reason } = req.body as ApproveStaffDto
    const staff = await adminService.rejectStaff(id, institution_id, reason)
    res.status(HTTP_STATUS.OK).json({
      message: 'Staff rejected',
      data: staff
    })
  }

  resetStaffPassword = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    await adminService.resetStaffPassword(id, institution_id)
    res.status(HTTP_STATUS.OK).json({
      message: 'Password reset email sent'
    })
  }

  assignStaffResident = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const body = req.body as AssignStaffResidentDto
    const data = await adminService.assignStaffResident(id, institution_id, body)
    res.status(HTTP_STATUS.OK).json({
      message: 'Assigned successfully',
      data
    })
  }

  unassignStaffResident = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const body = req.body as AssignStaffResidentDto
    await adminService.unassignStaffResident(id, institution_id, body.resident_id)
    res.status(HTTP_STATUS.OK).json({
      message: 'Unassigned successfully'
    })
  }

  getStaffAudit = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const logs = await adminService.getAuditLogs(institution_id, { target_type: 'staff', target_id: id })
    res.status(HTTP_STATUS.OK).json({
      message: 'Staff audit logs retrieved successfully',
      data: logs
    })
  }

  deleteStaff = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    await adminService.deleteStaff(id, institution_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Staff deleted successfully'
    })
  }

  // ========== TASKS ==========
  getTasks = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const query = req.query as unknown as GetTasksQuery
    const result = await adminService.getTasks(institution_id, query)

    res.status(HTTP_STATUS.OK).json({
      message: 'Tasks retrieved successfully',
      ...result
    })
  }

  createTask = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = req.body as CreateTaskDto
    const task = await adminService.createTask(institution_id, data)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Task created successfully',
      data: task
    })
  }

  updateTask = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = req.body as UpdateTaskDto
    const task = await adminService.updateTask(id, institution_id, data)

    res.status(HTTP_STATUS.OK).json({
      message: 'Task updated successfully',
      data: task
    })
  }

  deleteTask = async (req: Request, res: Response) => {
    const { id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    await adminService.deleteTask(id, institution_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Task deleted successfully'
    })
  }

  // ========== AUDIT ==========
  getAuditLogs = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const logs = await adminService.getAuditLogs(institution_id, req.query)
    res.status(HTTP_STATUS.OK).json({
      message: 'Audit logs retrieved successfully',
      data: logs
    })
  }

  // ========== SETTINGS ==========
  getSettings = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await adminService.getSettings(institution_id)
    res.status(HTTP_STATUS.OK).json({
      message: 'Settings retrieved successfully',
      data
    })
  }

  updateSettings = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const body = req.body as AdminSettingsDto
    const data = await adminService.updateSettings(institution_id, body)
    res.status(HTTP_STATUS.OK).json({
      message: 'Settings updated successfully',
      data
    })
  }

  // ========== ANALYTICS ==========
  getRevenueAnalytics = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const query = req.query as unknown as RevenueQuery
    const data = await adminService.getRevenueAnalytics(institution_id, query)
    res.status(HTTP_STATUS.OK).json({
      message: 'Revenue analytics retrieved successfully',
      data
    })
  }

  getAnalyticsSummary = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await adminService.getAnalyticsSummary(institution_id)
    res.status(HTTP_STATUS.OK).json({
      message: 'Analytics summary retrieved successfully',
      data
    })
  }
}

export const adminController = new AdminController()
