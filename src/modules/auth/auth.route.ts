import { Router } from 'express'
import { wrapRequestHandler } from '~/utils/handler'
import {
  accessTokenValidator,
  emailVerifyTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  renewInviteTokenValidator,
  resetPasswordValidator,
  verifyForgotPasswordValidator,
  validateFamilyLinkTokenValidator,
  confirmFamilyLinkValidator,
  resendEmailVerifyValidator,
  checkUserByEmailValidator
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
 * @body {email: string, password: string, confirm_password: string, role: string, full_name: string}
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

authRouter.post(
  '/resend-email-verify',
  resendEmailVerifyValidator,
  wrapRequestHandler(authController.resendEmailVerify)
)

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

/**
 * @description Renew invite token for all member of institution
 * @method POST
 * @path /auth/renew-invite-token
 * @body {email: string}
 * @response {message: string}
 */
authRouter.post(
  '/renew-invite-token',
  renewInviteTokenValidator,
  wrapRequestHandler(authController.renewInviteTokenForAllMemberOfInstitution)
)

/**
 * @description Validate token family link để frontend redirect đến trang xác thực
 * @method GET
 * @path /auth/family-link/validate?family_link_token=...
 */
authRouter.get(
  '/family-link/validate',
  validateFamilyLinkTokenValidator,
  wrapRequestHandler(authController.validateFamilyLinkToken)
)

/**
 * @description Family nhấn nút xác nhận để liên kết với Resident và Institution
 * @method POST
 * @path /auth/family-link/confirm
 * @body {family_link_token: string}
 */
authRouter.post(
  '/family-link/confirm',
  confirmFamilyLinkValidator,
  wrapRequestHandler(authController.confirmFamilyLink)
)

// người dùng resend email
authRouter.post('/family-link/resend', accessTokenValidator, wrapRequestHandler(authController.resendFamilyLink))

/**
 * @description Check if user with email exists and is a Family member
 * @method GET
 * @path /auth/check-user-by-email?email=xxx@example.com
 * @query {email: string}
 * @response {message: string, data: {user_id: string, email: string, role: string, status: string, family_name: string, family_phone: string}}
 */
authRouter.get('/check-user-by-email', checkUserByEmailValidator, wrapRequestHandler(authController.checkUserByEmail))

export default authRouter
