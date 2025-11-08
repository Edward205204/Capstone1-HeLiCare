import { Router } from 'express'
import { servicePackageController } from './service-package.controller'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidator } from '~/modules/auth/auth.middleware'
import {
  createServicePackageSchema,
  updateServicePackageSchema,
  packageIdSchema,
  getServicePackagesSchema
} from './service-package.schema'
import {
  packageIdValidator,
  isPackageBelongsToInstitution,
  isAdminOnly,
  validateRequest
} from './service-package.middleware'

const servicePackageRouter = Router()

// GET Routes - Lấy danh sách service packages
servicePackageRouter.get(
  '/',
  accessTokenValidator,
  getServicePackagesSchema,
  validateRequest,
  wrapRequestHandler(servicePackageController.getServicePackages)
)

servicePackageRouter.get(
  '/active',
  accessTokenValidator,
  wrapRequestHandler(servicePackageController.getActivePackages)
)

servicePackageRouter.get(
  '/type/:type',
  accessTokenValidator,
  wrapRequestHandler(servicePackageController.getServicePackagesByType)
)

servicePackageRouter.get(
  '/:package_id',
  accessTokenValidator,
  packageIdSchema,
  validateRequest,
  packageIdValidator,
  wrapRequestHandler(servicePackageController.getServicePackageById)
)

// POST Routes - Tạo mới service package (Admin only)
servicePackageRouter.post(
  '/',
  accessTokenValidator,
  isAdminOnly,
  createServicePackageSchema,
  validateRequest,
  wrapRequestHandler(servicePackageController.createServicePackage)
)

// PUT Routes - Cập nhật service package (Admin only)
servicePackageRouter.put(
  '/:package_id',
  accessTokenValidator,
  isAdminOnly,
  updateServicePackageSchema,
  validateRequest,
  packageIdValidator,
  isPackageBelongsToInstitution,
  wrapRequestHandler(servicePackageController.updateServicePackage)
)

servicePackageRouter.put(
  '/:package_id/deactivate',
  accessTokenValidator,
  isAdminOnly,
  packageIdSchema,
  validateRequest,
  packageIdValidator,
  isPackageBelongsToInstitution,
  wrapRequestHandler(servicePackageController.deactivateServicePackage)
)

// DELETE Routes - Xóa service package (Admin only)
servicePackageRouter.delete(
  '/:package_id',
  accessTokenValidator,
  isAdminOnly,
  packageIdSchema,
  validateRequest,
  packageIdValidator,
  isPackageBelongsToInstitution,
  wrapRequestHandler(servicePackageController.deleteServicePackage)
)

export default servicePackageRouter
