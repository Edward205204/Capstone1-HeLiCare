import { Router } from 'express'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidator, loginValidator, refreshTokenValidator, registerValidator } from './auth.middleware'
import { authController } from './auth.controller'

const authRouter = Router()

authRouter.post('/login', loginValidator, wrapRequestHandler(authController.login))
authRouter.post('/register', registerValidator, wrapRequestHandler(authController.register))
authRouter.post('/resend-email-verify', accessTokenValidator, wrapRequestHandler(authController.resendEmailVerify))
authRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapRequestHandler(authController.logout))
authRouter.post(
  '/logout-all-devices',
  accessTokenValidator,
  refreshTokenValidator,
  wrapRequestHandler(authController.logoutAllDevices)
)
export default authRouter
