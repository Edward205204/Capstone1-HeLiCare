import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'

import { mediaController } from './media.controller'
import { wrapRequestHandler } from '~/utils/handler'

const mediasRouter = Router()

mediasRouter.post('/upload-image', accessTokenValidator, wrapRequestHandler(mediaController.uploadImageController))

mediasRouter.post('/upload-video', accessTokenValidator, wrapRequestHandler(mediaController.uploadVideoController))

mediasRouter.post(
  '/upload-video-hls',
  accessTokenValidator,
  wrapRequestHandler(mediaController.uploadVideoHLSController)
)

mediasRouter.get('/video-encodes-status/:id', wrapRequestHandler(mediaController.getVideoEncodesStatusController))

export default mediasRouter
