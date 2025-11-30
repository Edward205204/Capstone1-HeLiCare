import { HTTP_STATUS } from '~/constants/http_status'
import { ResidentService, residentService as residentServiceInstance } from './resident.service'
import { Request, Response } from 'express'
import { GetAppointmentQueryParams } from './resident.dto'
import { prisma } from '~/utils/db'

class ResidentController {
  constructor(private readonly residentService: ResidentService = residentServiceInstance) {}

  getListResident = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { page, limit, search, room_id } = req.query

    const parsedPage = typeof page === 'string' && !Number.isNaN(Number(page)) ? Number(page) : undefined
    const parsedLimit = typeof limit === 'string' && !Number.isNaN(Number(limit)) ? Number(limit) : undefined
    const searchValue = typeof search === 'string' && search.trim().length > 0 ? search.trim() : undefined
    const roomFilter = typeof room_id === 'string' && room_id.length > 0 ? room_id : undefined

    const data = await this.residentService.getListResident({
      institution_id,
      page: parsedPage,
      limit: parsedLimit,
      search: searchValue,
      room_id: roomFilter
    })
    res.status(HTTP_STATUS.OK).json({ message: 'Resident fetched successfully', data })
  }

  getResidentById = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    const data = await this.residentService.getResidentById(resident_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Resident fetched successfully', data })
  }

  getApplicant = async (req: Request, res: Response) => {
    const { status } = req.query
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.residentService.getApplicant({ status: status as string | undefined, institution_id })
    res.status(HTTP_STATUS.OK).json({ message: 'Resident fetched successfully', data })
  }

  // createProfileForResident = async (req: Request, res: Response) => {
  //   const body = req.body
  //   const institution_id = req.decoded_authorization?.institution_id as string
  //   await this.residentService.createProfileForResident({ body, institution_id })
  //   res.status(HTTP_STATUS.OK).json({ message: 'Profile created successfully' })
  // }

  // thực hiện bởi staff (có thể link với family)
  createResident = async (req: Request, res: Response) => {
    const body = req.body
    // Get institution_id from token if not provided in body
    if (!body.institution_id && req.decoded_authorization?.institution_id) {
      body.institution_id = req.decoded_authorization.institution_id
    }
    const data = await this.residentService.createResident({ body })
    res.status(HTTP_STATUS.OK).json({ message: 'Resident created successfully', data })
  }

  createApplicant = async (req: Request, res: Response) => {
    const body = req.body
    await this.residentService.createApplicant({ body })
    res.status(HTTP_STATUS.OK).json({ message: 'Applicant created successfully' })
  }

  getAppointmentPending = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { take, skip } = req.query
    const data = await this.residentService.getAppointmentPending({
      institution_id,
      take: Number(take),
      skip: Number(skip)
    })
    res.status(HTTP_STATUS.OK).json({ message: 'Appointment list fetched successfully', data })
  }

  getAppointmentQuery = async (req: Request, res: Response) => {
    // time gồm all, lte today, gte today,
    const query = req.query as unknown as GetAppointmentQueryParams
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.residentService.getAppointmentQuery({
      ...query,
      institution_id
    })
    res.status(HTTP_STATUS.OK).json({
      message: 'Appointment query fetched successfully',
      data: {
        appointments: data.data,
        total: data.total
      }
    })
  }

  getAppointmentHistory = async (req: Request, res: Response) => {
    const { take, skip } = req.query
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.residentService.getAppointmentHistory({
      institution_id,
      take: Number(take) || 10,
      skip: Number(skip) || 0
    })
    res.status(HTTP_STATUS.OK).json({ message: 'Appointment history fetched successfully', data })
  }

  joinInstitution = async (req: Request, res: Response) => {
    const { resident_id } = req.body
    const institution_id = req.decoded_authorization?.institution_id as string
    await this.residentService.joinInstitutionByFamily({ resident_id, institution_id })
    res.status(HTTP_STATUS.OK).json({ message: 'Join institution successfully' })
  }

  updateResident = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    const data = await this.residentService.updateResident(resident_id, req.body)
    res.status(HTTP_STATUS.OK).json({ message: 'Resident updated successfully', data })
  }

  deleteResident = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    await this.residentService.deleteResident(resident_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Resident deleted successfully' })
  }

  // Lấy danh sách residents của family user
  getResidentsByFamily = async (req: Request, res: Response) => {
    const family_user_id = req.decoded_authorization?.user_id as string
    const data = await this.residentService.getResidentsByFamily(family_user_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Residents fetched successfully', data })
  }

  // Lấy danh sách người thân liên kết với resident
  getFamilyMembersByResident = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    const data = await this.residentService.getFamilyMembersByResident(resident_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Family members fetched successfully', data })
  }

  // Assign staff to resident
  assignStaffToResident = async (req: Request, res: Response) => {
    const { id: resident_id } = req.params
    const { staff_id, shift } = req.body
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    try {
      const data = await this.residentService.assignStaffToResident(resident_id, staff_id, institution_id)
      res.status(HTTP_STATUS.OK).json({ message: 'Staff assigned to resident successfully', data })
    } catch (error) {
      const err = error as { status?: number; message?: string }
      res.status(err.status || HTTP_STATUS.BAD_REQUEST).json({
        message: err.message || 'Failed to assign staff to resident'
      })
    }
  }

  // Get staff assigned to resident
  getResidentStaff = async (req: Request, res: Response) => {
    const { id: resident_id } = req.params
    try {
      const data = await this.residentService.getResidentStaff(resident_id)
      res.status(HTTP_STATUS.OK).json({ message: 'Resident staff fetched successfully', data })
    } catch (error) {
      const err = error as { status?: number; message?: string }
      res.status(err.status || HTTP_STATUS.NOT_FOUND).json({
        message: err.message || 'Resident not found'
      })
    }
  }

  // Get family dashboard data
  getFamilyDashboardData = async (req: Request, res: Response) => {
    const family_user_id = req.decoded_authorization?.user_id as string
    const resident_id = req.query.resident_id as string | undefined
    const data = await this.residentService.getFamilyDashboardData(family_user_id, resident_id)

    if (!data) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'No active resident link found. Please link to a resident first.',
        data: null
      })
      return
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Family dashboard data fetched successfully',
      data
    })
  }

  // Get resident dashboard data (for resident users)
  getResidentDashboardData = async (req: Request, res: Response) => {
    const user_id = req.decoded_authorization?.user_id as string
    
    if (!user_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'User ID not found in token',
        data: null
      })
      return
    }

    // Get resident_id from user_id
    const resident = await prisma.resident.findFirst({
      where: { user_id },
      select: { resident_id: true }
    })

    if (!resident) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Resident not found for this user',
        data: null
      })
      return
    }

    const data = await this.residentService.getResidentDashboardData(resident.resident_id)

    if (!data) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Resident dashboard data not found',
        data: null
      })
      return
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Resident dashboard data fetched successfully',
      data
    })
  }

  // Get resident accounts for password management
  getResidentAccounts = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { page, limit, search, password_status, sort_by, sort_order } = req.query

    const data = await this.residentService.getResidentAccounts({
      institution_id,
      page: typeof page === 'string' ? Number(page) : undefined,
      limit: typeof limit === 'string' ? Number(limit) : undefined,
      search: typeof search === 'string' ? search : undefined,
      password_status: password_status as 'all' | 'not_changed' | 'changed' | undefined,
      sort_by: sort_by as 'name' | 'created_at' | 'status' | undefined,
      sort_order: sort_order as 'asc' | 'desc' | undefined
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Resident accounts fetched successfully',
      data
    })
  }

  // Staff reset password for resident
  resetResidentPassword = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    const { new_password } = req.body

    if (!new_password || typeof new_password !== 'string' || new_password.length < 6) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Password must be at least 6 characters'
      })
      return
    }

    const data = await this.residentService.resetResidentPassword({
      resident_id,
      new_password
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Resident password reset successfully',
      data
    })
  }

  // Staff change password for resident
  changeResidentPassword = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    const { new_password } = req.body

    if (!new_password || typeof new_password !== 'string' || new_password.length < 6) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Password must be at least 6 characters'
      })
      return
    }

    const data = await this.residentService.changeResidentPassword({
      resident_id,
      new_password
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Resident password changed successfully',
      data
    })
  }
}

const residentController = new ResidentController()

export { residentController, ResidentController }
