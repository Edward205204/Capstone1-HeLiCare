import AddressJson from '~/models/address_json'
import { ContactJson } from '~/models/contact_json'
import { prisma } from '~/utils/db'
import { InstitutionUpdateData } from './institution.dto'
import { InstitutionContractStatus } from '@prisma/client'

// Interface cho dữ liệu update institution

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
    const institutions = await prisma.institution.findMany({ where: { status: InstitutionContractStatus.active } })
    return institutions
  }

  getInstitutionById = async (institution_id: string) => {
    const institution = await prisma.institution.findUnique({ where: { institution_id } })
    return institution
  }

  updateInstitution = async ({
    patchData,
    institution_id
  }: {
    patchData: InstitutionUpdateData
    institution_id: string
  }) => {
    // Chuyển đổi JsonValue thành InputJsonValue để tương thích với Prisma update
    const { address, contact_info, ...restData } = patchData
    const updateData = {
      ...restData,
      ...(address && { address: JSON.parse(JSON.stringify(address)) }),
      ...(contact_info && { contact_info: JSON.parse(JSON.stringify(contact_info)) })
    }

    const institution = await prisma.institution.update({
      where: { institution_id },
      data: updateData
    })
    return institution
  }

  updateInstitutionByInstitutionAdmin = async ({
    patchData,
    institution_id
  }: {
    patchData: InstitutionUpdateData
    institution_id: string
  }) => {
    // Chuyển đổi JsonValue thành InputJsonValue để tương thích với Prisma update
    const { address, contact_info, ...restData } = patchData
    const updateData = {
      ...restData,
      ...(address && { address: JSON.parse(JSON.stringify(address)) }),
      ...(contact_info && { contact_info: JSON.parse(JSON.stringify(contact_info)) })
    }

    const institution = await prisma.institution.update({
      where: { institution_id },
      data: updateData
    })
    return institution
  }

  deleteInstitution = async (institution_id: string) => {
    const institution = await prisma.institution.update({
      where: { institution_id },
      data: { status: InstitutionContractStatus.cancelled }
    })
    return institution
  }
}

const institutionService = new InstitutionService()

export { institutionService, InstitutionService }
