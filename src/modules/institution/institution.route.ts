import { Router } from 'express'
import { wrapRequestHandler } from '~/utils/handler'
import { createInstitutionValidator } from './institution.middleware'
import {
  institutionIdValidator,
  isHandleByRootFlatformAdmin,
  updateInstitutionValidator
} from '~/common/common.middleware'
import { institutionController } from './institution.controller'
import { accessTokenValidator } from '../auth/auth.middleware'

const institutionRouter = Router()

institutionRouter.post(
  '/create-institution',
  accessTokenValidator,
  isHandleByRootFlatformAdmin,
  createInstitutionValidator,
  wrapRequestHandler(institutionController.createInstitution)
)

// private route(có thể chứa thông tin nhạy cảm - update trong tương lai)
institutionRouter.get(
  '/get-list-institution',
  accessTokenValidator,
  isHandleByRootFlatformAdmin,
  wrapRequestHandler(institutionController.getListInstitution)
)

// public route(không chứa thông tin nhạy cảm - update trong tương lai)
institutionRouter.get(
  '/get-list-institution-public',
  wrapRequestHandler(institutionController.getListInstitutionPublic)
)

// private route
institutionRouter.get(
  '/get-institution-by-id/:institution_id',
  accessTokenValidator,
  isHandleByRootFlatformAdmin,
  institutionIdValidator,
  wrapRequestHandler(institutionController.getInstitutionById)
)

institutionRouter.patch(
  '/update-institution/:institution_id',
  accessTokenValidator,
  isHandleByRootFlatformAdmin,
  institutionIdValidator,
  updateInstitutionValidator,
  wrapRequestHandler(institutionController.updateInstitution)
)

export default institutionRouter
