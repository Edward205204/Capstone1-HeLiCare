import { HTTP_STATUS } from '~/constants/http_status'
import { ResidentService, residentService as residentServiceInstance } from './resident.service'
import { Request, Response } from 'express'

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

  getApplicantByFamilyFullName = async (req: Request, res: Response) => {
    const { full_name } = req.body
    const data = await this.residentService.getApplicantByFamilyFullName(full_name)
    res.status(HTTP_STATUS.OK).json({ message: 'Resident fetched successfully', data })
  }

  createProfileForResident = async (req: Request, res: Response) => {
    const body = req.body
    const institution_id = req.decoded_authorization?.institution_id as string
    await this.residentService.createProfileForResident({ body, institution_id })
    res.status(HTTP_STATUS.OK).json({ message: 'Profile created successfully' })
  }
}

const residentController = new ResidentController()

export { residentController, ResidentController }
