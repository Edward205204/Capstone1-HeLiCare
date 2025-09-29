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
}

const institutionController = new InstitutionController()

export { institutionController, InstitutionController }
