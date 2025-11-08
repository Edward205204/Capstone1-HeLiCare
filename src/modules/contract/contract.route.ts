import { Router } from 'express'
import { contractController } from './contract.controller'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidator } from '~/modules/auth/auth.middleware'
import {
  createContractSchema,
  updateContractSchema,
  contractIdSchema,
  getContractsSchema,
  addServiceToContractSchema,
  updateContractServiceSchema,
  signContractSchema
} from './contract.schema'
import {
  contractIdValidator,
  isContractBelongsToInstitution,
  residentIdValidator,
  contractServiceIdValidator,
  isAdminOrStaff,
  isAdminOnly,
  canAccessContract,
  validateRequest
} from './contract.middleware'

const contractRouter = Router()

// GET Routes - Lấy danh sách contracts
contractRouter.get(
  '/',
  accessTokenValidator,
  getContractsSchema,
  validateRequest,
  wrapRequestHandler(contractController.getContracts)
)

contractRouter.get(
  '/:contract_id',
  accessTokenValidator,
  contractIdSchema,
  validateRequest,
  contractIdValidator,
  canAccessContract,
  wrapRequestHandler(contractController.getContractById)
)

contractRouter.get(
  '/resident/:resident_id',
  accessTokenValidator,
  residentIdValidator,
  wrapRequestHandler(contractController.getContractsByResident)
)

contractRouter.get(
  '/resident/:resident_id/active',
  accessTokenValidator,
  residentIdValidator,
  wrapRequestHandler(contractController.getActiveContractByResident)
)

// POST Routes - Tạo mới contract (Admin/Staff only)
contractRouter.post(
  '/',
  accessTokenValidator,
  isAdminOrStaff,
  createContractSchema,
  validateRequest,
  wrapRequestHandler(contractController.createContract)
)

contractRouter.post(
  '/:contract_id/services',
  accessTokenValidator,
  isAdminOrStaff,
  addServiceToContractSchema,
  validateRequest,
  contractIdValidator,
  isContractBelongsToInstitution,
  wrapRequestHandler(contractController.addServiceToContract)
)

// PUT Routes - Cập nhật contract
contractRouter.put(
  '/:contract_id',
  accessTokenValidator,
  isAdminOrStaff,
  updateContractSchema,
  validateRequest,
  contractIdValidator,
  isContractBelongsToInstitution,
  wrapRequestHandler(contractController.updateContract)
)

contractRouter.put(
  '/:contract_id/sign',
  accessTokenValidator,
  isAdminOrStaff,
  signContractSchema,
  validateRequest,
  contractIdValidator,
  isContractBelongsToInstitution,
  wrapRequestHandler(contractController.signContract)
)

contractRouter.put(
  '/:contract_id/cancel',
  accessTokenValidator,
  isAdminOrStaff,
  contractIdSchema,
  validateRequest,
  contractIdValidator,
  isContractBelongsToInstitution,
  wrapRequestHandler(contractController.cancelContract)
)

contractRouter.put(
  '/services/:contract_service_id',
  accessTokenValidator,
  isAdminOrStaff,
  updateContractServiceSchema,
  validateRequest,
  contractServiceIdValidator,
  wrapRequestHandler(contractController.updateContractService)
)

// DELETE Routes - Xóa contract (Admin only)
contractRouter.delete(
  '/:contract_id',
  accessTokenValidator,
  isAdminOnly,
  contractIdSchema,
  validateRequest,
  contractIdValidator,
  isContractBelongsToInstitution,
  wrapRequestHandler(contractController.deleteContract)
)

export default contractRouter
