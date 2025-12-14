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

  getStaffById = async (req: Request, res: Response) => {
    const { staff_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const staff = await this.staffService.getStaffById(staff_id, institution_id)
    if (!staff) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Staff not found'
      })
      return
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Staff fetched successfully',
      data: staff
    })
  }

  getStaffResidents = async (req: Request, res: Response) => {
    const { staff_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const residents = await this.staffService.getStaffResidents(staff_id, institution_id)
    res.status(HTTP_STATUS.OK).json({
      message: 'Staff residents fetched successfully',
      data: residents
    })
  }

  getStaffTasks = async (req: Request, res: Response) => {
    const { staff_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const tasks = await this.staffService.getStaffTasks(staff_id, institution_id)
    res.status(HTTP_STATUS.OK).json({
      message: 'Staff tasks fetched successfully',
      data: tasks
    })
  }

  assignTaskToStaff = async (req: Request, res: Response) => {
    const { staff_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const { task_type, resident_id, due_time, description, title } = req.body

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const task = await this.staffService.assignTaskToStaff(staff_id, institution_id, {
      task_type,
      resident_id,
      due_time: new Date(due_time),
      description,
      title
    })

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Task assigned successfully',
      data: task
    })
  }

  markTaskDone = async (req: Request, res: Response) => {
    const { task_id } = req.params
    const staff_id = req.decoded_authorization?.user_id as string

    if (!staff_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Staff ID not found in token'
      })
      return
    }

    try {
      const task = await this.staffService.markTaskDone(task_id, staff_id)
      res.status(HTTP_STATUS.OK).json({
        message: 'Task marked as done successfully',
        data: task
      })
    } catch (error) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: (error as Error).message
      })
    }
  }

  getStaffPerformance = async (req: Request, res: Response) => {
    const { staff_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7) // Default to current month

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const performance = await this.staffService.getStaffPerformance(staff_id, institution_id, month)
    res.status(HTTP_STATUS.OK).json({
      message: 'Staff performance fetched successfully',
      data: performance
    })
  }

  createIncident = async (req: Request, res: Response) => {
    const staff_id = req.decoded_authorization?.user_id as string
    const institution_id = req.decoded_authorization?.institution_id as string
    const { resident_id, type, description, severity } = req.body

    if (!institution_id || !staff_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID or Staff ID not found in token'
      })
      return
    }

    const incident = await this.staffService.createIncident(staff_id, institution_id, {
      resident_id,
      type,
      description,
      severity
    })

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Incident reported successfully',
      data: incident
    })
  }

  getIncidents = async (req: Request, res: Response) => {
    const staff_id = req.decoded_authorization?.user_id as string
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id || !staff_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID or Staff ID not found in token'
      })
      return
    }

    const incidents = await this.staffService.getIncidents(staff_id, institution_id)
    res.status(HTTP_STATUS.OK).json({
      message: 'Incidents fetched successfully',
      data: incidents
    })
  }

  getSOSAlerts = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const alerts = await this.staffService.getSOSAlerts(institution_id)
    res.status(HTTP_STATUS.OK).json({
      message: 'SOS alerts fetched successfully',
      data: alerts
    })
  }

  updateAlertStatus = async (req: Request, res: Response) => {
    const { alert_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const staff_id = req.decoded_authorization?.user_id as string
    const { status, resolutionNotes } = req.body

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    if (!['acknowledged', 'in_progress', 'resolved', 'escalated'].includes(status)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Invalid status'
      })
      return
    }

    const resolved_by_id = status === 'resolved' ? staff_id : undefined

    const alert = await this.staffService.updateAlertStatus(
      alert_id,
      institution_id,
      status,
      resolved_by_id,
      resolutionNotes
    )

    res.status(HTTP_STATUS.OK).json({
      message: 'Alert status updated successfully',
      data: alert
    })
  }

  getAbnormalVitals = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const abnormalVitals = await this.staffService.getAbnormalVitals(resident_id, institution_id)

    if (!abnormalVitals) {
      res.status(HTTP_STATUS.OK).json({
        message: 'No abnormal vital signs found',
        data: null
      })
      return
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Abnormal vital signs fetched successfully',
      data: abnormalVitals
    })
  }

  createIncidentReport = async (req: Request, res: Response) => {
    const staff_id = req.decoded_authorization?.user_id as string
    const institution_id = req.decoded_authorization?.institution_id as string
    const { resident_id, incident_type, root_cause, actions_taken, outcome, occurred_at, staff_on_duty, images } =
      req.body

    if (!institution_id || !staff_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID or Staff ID not found in token'
      })
      return
    }

    if (!resident_id || !incident_type || !actions_taken || !outcome || !occurred_at) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Missing required fields'
      })
      return
    }

    const report = await this.staffService.createIncidentReport(staff_id, institution_id, {
      resident_id,
      incident_type,
      root_cause,
      actions_taken,
      outcome,
      occurred_at: new Date(occurred_at),
      staff_on_duty,
      images
    })

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Incident report created successfully',
      data: report
    })
  }

  getIncidentReports = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const staff_id = req.decoded_authorization?.user_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const reports = await this.staffService.getIncidentReports(institution_id, staff_id)
    res.status(HTTP_STATUS.OK).json({
      message: 'Incident reports fetched successfully',
      data: reports
    })
  }
}

export const staffController = new StaffController()
