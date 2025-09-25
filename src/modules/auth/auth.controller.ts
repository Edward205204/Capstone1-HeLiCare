import { CommonService, commonService as commonServiceInstance } from '~/common/common.service'
import { Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { AuthService, authService as authServiceInstance } from './auth.service'
import { User } from '@prisma/client'
import { RegisterDto } from './auth.dto'

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
    await this.authService.resendEmailVerify((req.user as User).email)
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
}

const authController = new AuthController()
export { authController, AuthController }
