import { HTTP_STATUS } from '~/constants/http_status'
import { ResidentService, residentService as residentServiceInstance } from './resident.service'
import { Request, Response } from 'express'
import { GetAppointmentQueryParams } from './resident.dto'

class ResidentController {
  constructor(private readonly residentService: ResidentService = residentServiceInstance) {}

  getListResident = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.residentService.getListResident(institution_id)
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
}

const residentController = new ResidentController()

export { residentController, ResidentController }
