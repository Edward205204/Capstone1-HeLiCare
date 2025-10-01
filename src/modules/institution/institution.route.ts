import { Router } from 'express'
import { wrapRequestHandler } from '~/utils/handler'
import { createInstitutionValidator } from './institution.middleware'
import {
  institutionIdValidator,
  isHandleByInstitutionAdmin,
  isHandleByRootFlatformAdmin,
  updateInstitutionValidator
} from './institution.middleware'
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

// just root flatform admin
institutionRouter.get(
  '/get-institution-by-id/:institution_id',
  accessTokenValidator,
  isHandleByRootFlatformAdmin,
  institutionIdValidator,
  wrapRequestHandler(institutionController.getInstitutionById)
)

// for institution admin
institutionRouter.get(
  '/get-institution-by-id-public/:institution_id',
  accessTokenValidator,
  isHandleByInstitutionAdmin,
  institutionIdValidator,
  wrapRequestHandler(institutionController.getInstitutionById)
)

// update by root flatform admin
institutionRouter.patch(
  '/update-institution-by-root-flatform-admin/:institution_id',
  accessTokenValidator,
  isHandleByRootFlatformAdmin,
  institutionIdValidator,
  updateInstitutionValidator,
  wrapRequestHandler(institutionController.updateInstitution)
)

// update by institution admin
institutionRouter.patch(
  '/update-institution-by-institution-admin/:institution_id',
  accessTokenValidator,
  isHandleByInstitutionAdmin,
  institutionIdValidator,
  updateInstitutionValidator,
  wrapRequestHandler(institutionController.updateInstitution)
)

export default institutionRouter
