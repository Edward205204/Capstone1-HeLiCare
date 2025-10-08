import { CommonService, commonService as commonServiceInstance } from '~/common/common.service'
import { Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { AuthService, authService as authServiceInstance } from './auth.service'
import { User, UserStatus } from '@prisma/client'
import { AccessTokenPayload, CreateStaffForInstitutionDto, EmailVerifyTokenReqBody, RegisterDto } from './auth.dto'

class AuthController {
  constructor(
    private readonly commonService: CommonService = commonServiceInstance,
    private readonly authService: AuthService = authServiceInstance
  ) {}

  login = async (req: Request, res: Response) => {
    const user = req.user as User
    const data = await this.authService.login({
      role: user.role,
      institution_id: user.institution_id,
      user_id: user.user_id,
      status: user.status
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Login successfully',
      data
    })
  }

  register = async (req: Request, res: Response) => {
    const data = await this.authService.register(req.body as RegisterDto)
    res.status(HTTP_STATUS.OK).json({
      message: 'Register successfully',
      data
    })
  }

  resendEmailVerify = async (req: Request, res: Response) => {
    await this.authService.resendEmailVerify(req.user as User)
    res.status(HTTP_STATUS.OK).json({
      message: 'Resend email verify successfully'
    })
  }

  logout = async (req: Request, res: Response) => {
    await this.authService.logout(req.body.refresh_token)
    res.status(HTTP_STATUS.OK).json({
      message: 'Logout successfully'
    })
  }

  logoutAllDevices = async (req: Request, res: Response) => {
    const user_id = (req.user as User).user_id
    await this.authService.logoutAllDevices(user_id)
    res.status(HTTP_STATUS.OK).json({
      message: 'Logout all devices successfully'
    })
  }

  forgotPassword = async (req: Request, res: Response) => {
    const user = req.user as User
    await this.authService.forgotPassword(user)
    res.status(HTTP_STATUS.OK).json({
      message: 'Forgot password successfully'
    })
  }

  verifyForgotPassword = async (req: Request, res: Response) => {
    res.status(HTTP_STATUS.OK).json({
      message: 'Verify forgot password successfully'
    })
  }

  resetPassword = async (req: Request, res: Response) => {
    const user = req.user as User
    const { password } = req.body
    await this.authService.resetPassword({
      user_id: user.user_id,
      password
    })
    res.status(HTTP_STATUS.OK).json({
      message: 'Reset password successfully'
    })
  }

  verifyEmailTokenController = async (req: Request, res: Response) => {
    const token_string = req.body.email_verify_token
    const decoded_email_verify_token = req.decoded_email_verify_token as EmailVerifyTokenReqBody
    const { user_id } = decoded_email_verify_token
    const user = await this.commonService.getUserById(user_id)

    if (!user) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      })
      return
    }

    if (user.status === UserStatus.active) {
      res.json({
        message: 'Email is verified before'
      })
      return
    }

    const data = await this.authService.verifyEmailToken(user, token_string)
    res.status(HTTP_STATUS.OK).json({
      message: 'Verify email successfully',
      data
    })
    return
  }

  createStaffForInstitution = async (req: Request, res: Response) => {
    await this.authService.createStaffForInstitution(req.body as CreateStaffForInstitutionDto)
    res.status(HTTP_STATUS.OK).json({
      message: 'Create staff for institution successfully'
    })
  }

  verifyStaffInviteAndResetPassword = async (req: Request, res: Response) => {
    const token_string = req.body.staff_invite_token
    const { email, password } = req.body
    await this.authService.verifyInviteTokenAndResetPassword({ email, password, token_string })
    res.status(HTTP_STATUS.OK).json({
      message: 'Verify staff invite successfully'
    })
  }

  createRootAdmin = async (req: Request, res: Response) => {
    const { email, institution_id } = req.body
    await this.authService.createRootAdmin({ email, institution_id })
    res.status(HTTP_STATUS.OK).json({
      message: 'Create root admin successfully'
    })
  }

  verifyRootAdminInviteAndResetPassword = async (req: Request, res: Response) => {
    const token_string = req.body.root_admin_invite_token
    const { email, password } = req.body
    await this.authService.verifyInviteTokenAndResetPassword({ email, password, token_string })
    res.status(HTTP_STATUS.OK).json({
      message: 'Verify root admin invite successfully'
    })
  }

  renewToken = async (req: Request, res: Response) => {
    const user = req.user as User
    await this.authService.renewInviteToken(user)
    res.status(HTTP_STATUS.OK).json({
      message: 'Renew token successfully'
    })
  }

  createAdmin = async (req: Request, res: Response) => {
    const { email } = req.body
    const institution_id = (req.decoded_authorization as AccessTokenPayload).institution_id as string
    await this.authService.createAdmin({ email, institution_id })
    res.status(HTTP_STATUS.OK).json({
      message: 'Create admin successfully'
    })
  }

  verifyAdminInviteAndResetPassword = async (req: Request, res: Response) => {
    const token_string = req.body.admin_invite_token
    const { email, password } = req.body
    await this.authService.verifyInviteTokenAndResetPassword({ email, password, token_string })
    res.status(HTTP_STATUS.OK).json({
      message: 'Verify admin invite successfully'
    })
  }

  // connectResidentWithFamily = async (req: Request, res: Response) => {
  //   const { resident_id, family_email } = req.body
  //   const sender = req.user as User
  //   await this.authService.sendFamilyLink({
  //     sender_user_id: sender.user_id,
  //     resident_id,
  //     family_email
  //   })
  //   res.status(HTTP_STATUS.OK).json({
  //     message: 'Send family link successfully'
  //   })
  // }

  sendFamilyLink = async (req: Request, res: Response) => {
    const { resident_id, family_email } = req.body
    const sender = req.user as User
    await this.authService.sendFamilyLink({
      sender_user_id: sender.user_id,
      resident_id,
      family_email
    })
    res.status(HTTP_STATUS.OK).json({
      message: 'Send family link successfully'
    })
  }

  validateFamilyLinkToken = async (req: Request, res: Response) => {
    const token_string = req.query.family_link_token as string
    const data = await this.authService.validateFamilyLinkToken(token_string)
    res.status(HTTP_STATUS.OK).json({
      message: 'Family link token is valid',
      data
    })
  }

  confirmFamilyLink = async (req: Request, res: Response) => {
    const token_string = req.body.family_link_token as string
    await this.authService.confirmFamilyLink(token_string)
    res.status(HTTP_STATUS.OK).json({
      message: 'Confirm family link successfully'
    })
  }

  resendFamilyLink = async (req: Request, res: Response) => {
    const family_user_id = req.decoded_authorization?.user_id as string
    await this.authService.resendFamilyLink(family_user_id)
    res.status(HTTP_STATUS.OK).json({
      message: 'Resend family link successfully'
    })
  }
}

const authController = new AuthController()
export { authController, AuthController }
