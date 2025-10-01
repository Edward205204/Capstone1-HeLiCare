import AddressJson from '~/constants/address_json'
import { ContactJson } from '~/constants/contact_json'
import { prisma } from '~/utils/db'

class InstitutionService {
  constructor() {}

  createInstitution = async (name: string, address: AddressJson, contact_info: ContactJson) => {
    const addressJson = JSON.parse(JSON.stringify(address))
    const contactInfoJson = JSON.parse(JSON.stringify(contact_info))
    await prisma.institution.create({
      data: { name, address: addressJson, contact_info: contactInfoJson }
    })
  }

  getListInstitution = async () => {
    const institutions = await prisma.institution.findMany()
    return institutions
  }

  getInstitutionById = async (institution_id: string) => {
    const institution = await prisma.institution.findUnique({ where: { institution_id } })
    return institution
  }
}

const institutionService = new InstitutionService()

export { institutionService, InstitutionService }
