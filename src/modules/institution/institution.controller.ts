import { Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { InstitutionService, institutionService as institutionServiceInstance } from './institution.service'
import AddressJson from '~/constants/address_json'
import { ContactJson } from '~/constants/contact_json'

class InstitutionController {
  constructor(private readonly institutionService: InstitutionService = institutionServiceInstance) {}

  createInstitution = async (req: Request, res: Response) => {
    const { name, address, contact_info } = req.body
    await this.institutionService.createInstitution(name, address as AddressJson, contact_info as ContactJson)
    res.status(HTTP_STATUS.OK).json({ message: 'Institution created successfully' })
  }

  getListInstitution = async (req: Request, res: Response) => {
    const data = await this.institutionService.getListInstitution()
    res.status(HTTP_STATUS.OK).json({ message: 'Institution list fetched successfully', data })
  }

  getListInstitutionPublic = async (req: Request, res: Response) => {
    const data = await this.institutionService.getListInstitution()
    res.status(HTTP_STATUS.OK).json({ message: 'Institution list fetched successfully', data })
  }

  getInstitutionById = async (req: Request, res: Response) => {
    const { institution_id } = req.params
    const data = await this.institutionService.getInstitutionById(institution_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Get institution by id successfully', data })
  }

  updateInstitution = async (req: Request, res: Response) => {
    const { institution_id } = req.params
    const patchData = req.body
    console.log(patchData)
    res.status(HTTP_STATUS.OK).json({ message: 'Update institution by id successfully', data: institution_id })
  }

  // updateInstitutionByInstitutionAdmin = async (req: Request, res: Response) => {
  //   const { institution_id } = req.params
  //   res.status(HTTP_STATUS.OK).json({ message: 'Update institution by id successfully', data: institution_id })
  // }
}

const institutionController = new InstitutionController()

export { institutionController, InstitutionController }
