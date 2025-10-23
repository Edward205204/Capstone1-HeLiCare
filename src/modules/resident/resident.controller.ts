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

  // thực hiện bởi family
  createResident = async (req: Request, res: Response) => {
    const body = req.body
    await this.residentService.createResident({ body })
    res.status(HTTP_STATUS.OK).json({ message: 'Resident created successfully' })
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
}

const residentController = new ResidentController()

export { residentController, ResidentController }
