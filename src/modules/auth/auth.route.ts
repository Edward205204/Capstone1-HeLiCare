import { Router } from 'express'
import { wrapRequestHandler } from '~/utils/handler'
import {
  accessTokenValidator,
  createAdminForInstitutionValidator,
  emailVerifyTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  verifyForgotPasswordValidator
} from './auth.middleware'
import { authController } from './auth.controller'

const authRouter = Router()
/**
 * @description Login for All Role
 * @method POST
 * @path /auth/login
 * @body {email: string, password: string}
 * @response {message: string, data: {access_token: string, refresh_token: string}}
 */
authRouter.post('/login', loginValidator, wrapRequestHandler(authController.login))

/**
 * @description Register for Family and Resident
 * @method POST
 * @path /auth/register
 * @body {email: string, password: string, confirm_password: string, role: string}
 * @response {message: string, data: {access_token: string, refresh_token: string}}
 */
authRouter.post('/register', registerValidator, wrapRequestHandler(authController.register))

/**
 * @description Resend email verify for Family and Resident
 * @method POST
 * @header {Authorization: Bearer <access_token>}
 * @path /auth/resend-email-verify
 * @response {message: string}
 */
authRouter.post('/resend-email-verify', accessTokenValidator, wrapRequestHandler(authController.resendEmailVerify))

authRouter.post(
  '/verify-email',
  emailVerifyTokenValidator,
  wrapRequestHandler(authController.verifyEmailTokenController)
)

/**
 * @description Logout for All Role
 * @method POST
 * @path /auth/logout
 * @body {refresh_token: string}
 * @response {message: string}
 */
authRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapRequestHandler(authController.logout))

/**
 * @description Logout all devices for All Role
 * @method POST
 * @path /auth/logout-all-devices
 * @response {message: string}
 */
authRouter.post('/logout-all-devices', accessTokenValidator, wrapRequestHandler(authController.logoutAllDevices))

/**
 * @description Forgot password for Family and Resident
 * @method POST
 * @path /auth/forgot-password
 * @body {email: string}
 * @response {message: string}
 */
authRouter.post('/forgot-password', forgotPasswordValidator, wrapRequestHandler(authController.forgotPassword))

/**
 * @description Verify forgot password for Family and Resident
 * @method POST
 * @path /auth/verify-forgot-password
 * @body {forgot_password_token: string}
 * @response {message: string}
 */
authRouter.post(
  '/verify-forgot-password',
  verifyForgotPasswordValidator,
  wrapRequestHandler(authController.verifyForgotPassword)
)

/**
 * @description Reset password for Family and Resident
 * @method POST
 * @path /auth/reset-password
 * @body {password: string, confirm_password: string, forgot_password_token: string}
 * @response {message: string}
 */
authRouter.post('/reset-password', resetPasswordValidator, wrapRequestHandler(authController.resetPassword))

authRouter.post(
  '/create-admin-for-institution',
  createAdminForInstitutionValidator
  // wrapRequestHandler(authController.createAdminForInstitution)
)
export default authRouter
