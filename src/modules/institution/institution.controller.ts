import { Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { InstitutionService, institutionService as institutionServiceInstance } from './institution.service'
import AddressJson from '~/models/address_json'
import { ContactJson } from '~/models/contact_json'
import { InstitutionUpdateData } from './institution.dto'

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
    const { name, address, contact_info } = req.body

    // Tạo patchData với kiểu dữ liệu phù hợp
    const patchData: InstitutionUpdateData = {
      institution_id,
      name,
      address: address as AddressJson,
      contact_info: contact_info as ContactJson
    }

    await this.institutionService.updateInstitution({ patchData, institution_id })
    res.status(HTTP_STATUS.OK).json({ message: 'Update institution by id successfully' })
  }

  updateInstitutionByInstitutionAdmin = async (req: Request, res: Response) => {
    const { name, address, contact_info } = req.body
    const institution_id = req.decoded_authorization?.institution_id as string

    // Tạo patchData với kiểu dữ liệu phù hợp
    const patchData: InstitutionUpdateData = {
      institution_id,
      name,
      address: address as AddressJson,
      contact_info: contact_info as ContactJson
    }

    await this.institutionService.updateInstitutionByInstitutionAdmin({ patchData, institution_id })
    res.status(HTTP_STATUS.OK).json({ message: 'Update institution by id successfully' })
  }

  deleteInstitution = async (req: Request, res: Response) => {
    const { institution_id } = req.params
    await this.institutionService.deleteInstitution(institution_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Delete institution by id successfully' })
  }
}

const institutionController = new InstitutionController()

export { institutionController, InstitutionController }
