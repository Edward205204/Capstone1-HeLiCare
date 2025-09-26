import { CommonService, commonService as commonServiceInstance } from '~/common/common.service'
import { Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { AuthService, authService as authServiceInstance } from './auth.service'
import { User, UserStatus } from '@prisma/client'
import { EmailVerifyTokenReqBody, RegisterDto } from './auth.dto'

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
}

const authController = new AuthController()
export { authController, AuthController }
