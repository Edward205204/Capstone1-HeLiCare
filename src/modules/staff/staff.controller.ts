import { NextFunction, Request, Response } from 'express'
import { StaffService, staffService as staffServiceInstance } from './staff.service'
import { HTTP_STATUS } from '~/constants/http_status'
import { capitalize } from 'lodash'
import { TokenType } from '@prisma/client'
import { env } from '~/utils/dot.env'
import { verifyToken } from '~/utils/jwt'
import { accessTokenDecode } from '~/utils/access_token_decode'
import { CommonService, commonService as commonServiceInstance } from '~/common/common.service'
import { MediaService, mediaService as mediaServiceInstance } from '../media/media.service'

//tạm thời import từ auth.dto
import { AccessTokenPayload, StaffInviteTokenReqBody } from '../auth/auth.dto'
import { CreateStaffForInstitutionDto } from './staff.dto'

class StaffController {
  constructor(
    private readonly staffService: StaffService = staffServiceInstance,
    private readonly commonService: CommonService = commonServiceInstance,
    private readonly mediaService: MediaService = mediaServiceInstance
  ) {}
  createStaffForInstitution = async (req: Request, res: Response) => {
    await this.staffService.createStaffForInstitution(req.body as CreateStaffForInstitutionDto)
    res.status(HTTP_STATUS.OK).json({
      message: 'Create staff for institution successfully'
    })
  }

  uploadStaffAvatar = async (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.headers.authorization
    const staffInviteToken = req.query.staff_invite_token as string | undefined

    if (!authorization && !staffInviteToken) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Authorization is required'
      })
      return
    }

    if (authorization) {
      const token = authorization.split(' ')[1]
      if (!token) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          message: 'Access token is invalid'
        })
        return
      }
      try {
        await accessTokenDecode(token, req)
      } catch (error) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          message: capitalize((error as Error).message)
        })
        return
      }
    }

    if (staffInviteToken) {
      try {
        const [decoded_staff_invite_token, userToken] = await Promise.all([
          verifyToken({
            token: staffInviteToken,
            secretOrPublicKey: env.JWT_SECRET_KEY_COMMON_TOKEN as string
          }),
          this.commonService.getUserTokenByTokenString({
            token_string: staffInviteToken
          })
        ])

        if (decoded_staff_invite_token.token_type !== TokenType.StaffInviteToken) {
          res.status(HTTP_STATUS.UNAUTHORIZED).json({
            message: 'Staff invite token is invalid'
          })
          return
        }

        if (!userToken) {
          res.status(HTTP_STATUS.UNAUTHORIZED).json({
            message: 'Staff invite token is not found'
          })
          return
        }

        ;(req as Request).decoded_staff_invite_token = decoded_staff_invite_token as StaffInviteTokenReqBody
      } catch (error) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          message: capitalize((error as Error).message)
        })
        return
      }
    }

    const images = await this.mediaService.uploadImage(req, res, next)
    const image = images[0]

    if (!image) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Image is required'
      })
      return
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Upload staff avatar successfully',
      data: image
    })
  }

  verifyStaffInviteAndResetPassword = async (req: Request, res: Response) => {
    const token_string = req.body.staff_invite_token
    const { email, password, avatar } = req.body
    await this.staffService.verifyInviteTokenAndResetPassword({ email, password, token_string, avatar })
    res.status(HTTP_STATUS.OK).json({
      message: 'Verify staff invite successfully'
    })
  }

  createRootAdmin = async (req: Request, res: Response) => {
    const { email, institution_id } = req.body
    await this.staffService.createRootAdmin({ email, institution_id })
    res.status(HTTP_STATUS.OK).json({
      message: 'Create root admin successfully'
    })
  }

  verifyRootAdminInviteAndResetPassword = async (req: Request, res: Response) => {
    const token_string = req.body.root_admin_invite_token
    const { email, password } = req.body
    await this.staffService.verifyInviteTokenAndResetPassword({ email, password, token_string })
    res.status(HTTP_STATUS.OK).json({
      message: 'Verify root admin invite successfully'
    })
  }

  createAdmin = async (req: Request, res: Response) => {
    const { email } = req.body
    const institution_id = (req.decoded_authorization as AccessTokenPayload).institution_id as string
    await this.staffService.createAdmin({ email, institution_id })
    res.status(HTTP_STATUS.OK).json({
      message: 'Create admin successfully'
    })
  }

  verifyAdminInviteAndResetPassword = async (req: Request, res: Response) => {
    const token_string = req.body.admin_invite_token
    const { email, password } = req.body
    await this.staffService.verifyInviteTokenAndResetPassword({ email, password, token_string })
    res.status(HTTP_STATUS.OK).json({
      message: 'Verify admin invite successfully'
    })
  }

  getStaffList = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const take = Number(req.query.take) || 10
    const skip = Number(req.query.skip) || 0

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const staffList = await this.staffService.getStaffListByInstitution(institution_id, take, skip)
    res.status(HTTP_STATUS.OK).json({
      message: 'Staff list fetched successfully',
      data: staffList
    })
  }
}

export const staffController = new StaffController()
