import { Router } from 'express'
import { wrapRequestHandler } from '~/utils/handler'
import {
  accessTokenValidator,
  createAdminValidator,
  createRootAdminValidator,
  createStaffForInstitutionValidator,
  emailVerifyTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  renewInviteTokenValidator,
  resetPasswordValidator,
  verifyForgotPasswordValidator,
  verifyRootAdminInviteTokenValidator,
  verifyStaffInviteTokenValidator,
  verifyAdminInviteTokenValidator
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

/**
 * @description Create staff for institution
 * @method POST
 * @path /auth/create-staff-for-institution
 * @body {
 *   email: string,            // Staff email (must be unique)
 *   full_name: string,        // Staff full name
 *   phone: string,            // Staff phone number
 *   hire_date: string,        // Date of hire
 *   position: string,         // Staff position (enum)
 *   notes: string,            // Optional notes
 *   institution_id: string    // ID of the institution
 * }
 * @response { message: string }
 */

authRouter.post(
  '/create-staff-for-institution',
  accessTokenValidator,
  createStaffForInstitutionValidator,
  wrapRequestHandler(authController.createStaffForInstitution)
)

/**
 * @description Staff vào link từ email nhập email, password và confirm password
 * @method POST
 * @path /auth/verify-staff-invite-and-reset-password
 * @body {email: string, password: string, staff_invite_token: string}
 * @response {message: string}
 */
authRouter.post(
  '/verify-staff-invite-and-reset-password',
  verifyStaffInviteTokenValidator,
  wrapRequestHandler(authController.verifyStaffInviteAndResetPassword)
)

/**
 * @description Create root admin
 * @method POST
 * @path /auth/create-root-admin
 * @body {email: string, institution_id: string}
 * @response {message: string}
 */
authRouter.post(
  '/create-root-admin',
  accessTokenValidator,
  createRootAdminValidator,
  wrapRequestHandler(authController.createRootAdmin)
)

/**
 * @description Verify root admin invite and reset password
 * @method POST
 * @path /auth/verify-root-admin-invite-and-reset-password
 * @body {email: string, password: string, root_admin_invite_token: string}
 * @response {message: string}
 */
authRouter.post(
  '/verify-root-admin-invite-and-reset-password',
  verifyRootAdminInviteTokenValidator,
  wrapRequestHandler(authController.verifyRootAdminInviteAndResetPassword)
)

/**
 * @description Renew invite token
 * @method POST
 * @path /auth/renew-invite-token
 * @body {email: string}
 * @response {message: string}
 */
authRouter.post('/renew-invite-token', renewInviteTokenValidator, wrapRequestHandler(authController.renewToken))

/**
 * @description Create admin by root admin
 * @method POST
 * @path /auth/create-admin
 * @body {email: string}
 * @header {Authorization: Bearer <access_token>}
 * @response {message: string}
 */
authRouter.post(
  '/create-admin',
  accessTokenValidator,
  createAdminValidator,
  wrapRequestHandler(authController.createAdmin)
)

/**
 * @description Verify admin invite and reset password
 * @method POST
 * @path /auth/verify-admin-invite-and-reset-password
 * @body {email: string, password: string, confirm_password: string, admin_invite_token: string}
 * @response {message: string}
 */
authRouter.post(
  '/verify-admin-invite-and-reset-password',
  verifyAdminInviteTokenValidator,
  wrapRequestHandler(authController.verifyAdminInviteAndResetPassword)
)

export default authRouter
