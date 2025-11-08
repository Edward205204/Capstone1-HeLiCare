import { prisma } from '~/utils/db'
import {
  CreateServicePackageParams,
  UpdateServicePackageParams,
  GetServicePackagesParams,
  GetServicePackagesByTypeParams
} from './service-package.dto'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'

class ServicePackageService {
  constructor() {}

  // GET Methods
  getServicePackages = async (params: GetServicePackagesParams) => {
    const { institution_id, type, is_active, room_type, take = 20, skip = 0 } = params

    const where: any = { institution_id }

    if (type) {
      where.type = type
    }

    if (is_active !== undefined) {
      where.is_active = is_active
    }

    if (room_type) {
      where.room_type = room_type
    }

    const [packages, total] = await Promise.all([
      prisma.servicePackage.findMany({
        where,
        include: {
          institution: {
            select: {
              institution_id: true,
              name: true
            }
          }
        },
        take,
        skip,
        orderBy: { created_at: 'desc' }
      }),
      prisma.servicePackage.count({ where })
    ])

    return { packages, total }
  }

  getServicePackageById = async (package_id: string) => {
    const servicePackage = await prisma.servicePackage.findUnique({
      where: { package_id },
      include: {
        institution: {
          select: {
            institution_id: true,
            name: true,
            address: true,
            contact_info: true
          }
        },
        contractServices: {
          include: {
            contract: {
              select: {
                contract_id: true,
                contract_number: true,
                status: true
              }
            }
          }
        }
      }
    })

    if (!servicePackage) {
      throw new ErrorWithStatus({
        message: 'Service package not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return servicePackage
  }

  getServicePackagesByType = async (params: GetServicePackagesByTypeParams) => {
    const { institution_id, type, take = 20, skip = 0 } = params

    const packages = await prisma.servicePackage.findMany({
      where: {
        institution_id,
        type,
        is_active: true
      },
      take,
      skip,
      orderBy: { created_at: 'desc' }
    })

    return packages
  }

  getActivePackages = async (institution_id: string) => {
    const packages = await prisma.servicePackage.findMany({
      where: {
        institution_id,
        is_active: true
      },
      orderBy: [{ type: 'asc' }, { price_monthly: 'asc' }]
    })

    return packages
  }

  // POST Methods
  createServicePackage = async (data: CreateServicePackageParams) => {
    const {
      institution_id,
      name,
      description,
      type,
      price_monthly,
      price_annually,
      room_type,
      includes_room,
      features,
      max_residents
    } = data

    const newPackage = await prisma.servicePackage.create({
      data: {
        institution_id,
        name,
        description,
        type,
        price_monthly,
        price_annually,
        room_type,
        includes_room,
        features: features ? JSON.parse(JSON.stringify(features)) : null,
        max_residents
      }
    })

    return newPackage
  }

  // PUT Methods
  updateServicePackage = async (params: UpdateServicePackageParams) => {
    const { package_id, updateData } = params

    // Check if package exists
    const existingPackage = await prisma.servicePackage.findUnique({
      where: { package_id }
    })

    if (!existingPackage) {
      throw new ErrorWithStatus({
        message: 'Service package not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Convert features to JSON if provided
    const dataToUpdate: any = { ...updateData }
    if (updateData.features) {
      dataToUpdate.features = JSON.parse(JSON.stringify(updateData.features))
    }

    const updatedPackage = await prisma.servicePackage.update({
      where: { package_id },
      data: dataToUpdate
    })

    return updatedPackage
  }

  // DELETE Methods
  deleteServicePackage = async (package_id: string) => {
    // Check if package exists
    const existingPackage = await prisma.servicePackage.findUnique({
      where: { package_id },
      include: {
        contractServices: true
      }
    })

    if (!existingPackage) {
      throw new ErrorWithStatus({
        message: 'Service package not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Check if package is used in any contracts
    if (existingPackage.contractServices.length > 0) {
      throw new ErrorWithStatus({
        message: 'Cannot delete service package that is used in contracts',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    await prisma.servicePackage.delete({
      where: { package_id }
    })
  }

  // Soft delete - deactivate package
  deactivateServicePackage = async (package_id: string) => {
    const updatedPackage = await prisma.servicePackage.update({
      where: { package_id },
      data: { is_active: false }
    })

    return updatedPackage
  }
}

const servicePackageService = new ServicePackageService()

export { servicePackageService, ServicePackageService }
