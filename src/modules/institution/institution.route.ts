import { Router } from 'express'
import { wrapRequestHandler } from '~/utils/handler'
import { createInstitutionValidator } from './institution.middleware'
import { isHandleByRootFlatformAdmin } from '~/common/common.middleware'
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

institutionRouter.get(
  '/get-list-institution',
  accessTokenValidator,
  isHandleByRootFlatformAdmin,
  wrapRequestHandler(institutionController.getListInstitution)
)

export default institutionRouter
