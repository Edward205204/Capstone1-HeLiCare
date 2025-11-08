import { Request, Response } from 'express'
import { servicePackageService } from './service-package.service'
import { HTTP_STATUS } from '~/constants/http_status'
import { ServiceType } from '@prisma/client'

class ServicePackageController {
  constructor() {}

  // GET Methods
  getServicePackages = async (req: Request, res: Response) => {
    const { institution_id } = req.decoded_authorization as any
    const { type, is_active, room_type, take, skip } = req.query

    const result = await servicePackageService.getServicePackages({
      institution_id,
      type: type as ServiceType,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
      room_type: room_type as any,
      take: take ? parseInt(take as string) : undefined,
      skip: skip ? parseInt(skip as string) : undefined
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Get service packages successfully',
      data: result.packages,
      total: result.total
    })
  }

  getServicePackageById = async (req: Request, res: Response) => {
    const { package_id } = req.params

    const servicePackage = await servicePackageService.getServicePackageById(package_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get service package successfully',
      data: servicePackage
    })
  }

  getServicePackagesByType = async (req: Request, res: Response) => {
    const { institution_id } = req.decoded_authorization as any
    const { type } = req.params
    const { take, skip } = req.query

    const packages = await servicePackageService.getServicePackagesByType({
      institution_id,
      type: type as ServiceType,
      take: take ? parseInt(take as string) : undefined,
      skip: skip ? parseInt(skip as string) : undefined
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Get service packages by type successfully',
      data: packages
    })
  }

  getActivePackages = async (req: Request, res: Response) => {
    const { institution_id } = req.decoded_authorization as any

    const packages = await servicePackageService.getActivePackages(institution_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get active service packages successfully',
      data: packages
    })
  }

  // POST Methods
  createServicePackage = async (req: Request, res: Response) => {
    const { institution_id } = req.decoded_authorization as any
    const {
      name,
      description,
      type,
      price_monthly,
      price_annually,
      room_type,
      includes_room,
      features,
      max_residents
    } = req.body

    const newPackage = await servicePackageService.createServicePackage({
      institution_id,
      name,
      description,
      type,
      price_monthly,
      price_annually,
      room_type,
      includes_room: includes_room || false,
      features,
      max_residents
    })

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Create service package successfully',
      data: newPackage
    })
  }

  // PUT Methods
  updateServicePackage = async (req: Request, res: Response) => {
    const { package_id } = req.params
    const updateData = req.body

    const updatedPackage = await servicePackageService.updateServicePackage({
      package_id,
      updateData
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Update service package successfully',
      data: updatedPackage
    })
  }

  // DELETE Methods
  deleteServicePackage = async (req: Request, res: Response) => {
    const { package_id } = req.params

    await servicePackageService.deleteServicePackage(package_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Delete service package successfully'
    })
  }

  deactivateServicePackage = async (req: Request, res: Response) => {
    const { package_id } = req.params

    const updatedPackage = await servicePackageService.deactivateServicePackage(package_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Deactivate service package successfully',
      data: updatedPackage
    })
  }
}

const servicePackageController = new ServicePackageController()

export { servicePackageController, ServicePackageController }
