import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'

import { wrapRequestHandler } from '~/utils/handler'
import { residentController } from './resident.controller'
import { residentIdValidator } from './resident.middleware'
const residentRouter = Router()

residentRouter.get(
  '/get-resident',
  accessTokenValidator,
  wrapRequestHandler(wrapRequestHandler(residentController.getListResident))
)

residentRouter.get(
  '/get-resident-by-id/:resident_id',
  accessTokenValidator,
  residentIdValidator,
  wrapRequestHandler(residentController.getResidentById)
)

residentRouter.post(
  '/create-profile-for-resident',
  accessTokenValidator,
  wrapRequestHandler(residentController.createProfileForResident)
)

export default residentRouter
