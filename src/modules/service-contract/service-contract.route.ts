import { Router } from 'express'
import { serviceContractController } from './service-contract.controller'
import {
  isHandleByAdminOrStaff,
  isHandleByFamily,
  createServiceContractValidator,
  updateServiceContractValidator,
  contractIdParamValidator
} from './service-contract.middleware'
import { accessTokenValidator } from '../auth/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'

const serviceContractRouter = Router()

// Tạo hợp đồng (Admin/Staff)
serviceContractRouter.post(
  '/',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  createServiceContractValidator,
  wrapRequestHandler(serviceContractController.createServiceContract)
)

// Lấy danh sách hợp đồng (Admin/Staff)
serviceContractRouter.get(
  '/',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  wrapRequestHandler(serviceContractController.getServiceContracts)
)

// Lấy hợp đồng của Family user
serviceContractRouter.get(
  '/family',
  accessTokenValidator,
  isHandleByFamily,
  wrapRequestHandler(serviceContractController.getServiceContractsByFamily)
)

// Lấy hợp đồng của resident
serviceContractRouter.get(
  '/resident/:id',
  accessTokenValidator,
  contractIdParamValidator,
  wrapRequestHandler(serviceContractController.getServiceContractByResidentId)
)

// Lấy hợp đồng theo ID
serviceContractRouter.get(
  '/:id',
  accessTokenValidator,
  contractIdParamValidator,
  wrapRequestHandler(serviceContractController.getServiceContractById)
)

// Cập nhật hợp đồng (Admin/Staff)
serviceContractRouter.patch(
  '/:id',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  contractIdParamValidator,
  updateServiceContractValidator,
  wrapRequestHandler(serviceContractController.updateServiceContract)
)

// Xóa/hủy hợp đồng (Admin/Staff)
serviceContractRouter.delete(
  '/:id',
  accessTokenValidator,
  isHandleByAdminOrStaff,
  contractIdParamValidator,
  wrapRequestHandler(serviceContractController.deleteServiceContract)
)

export default serviceContractRouter
