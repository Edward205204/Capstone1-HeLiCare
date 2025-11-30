import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { HTTP_STATUS } from '~/constants/http_status'
import { ErrorWithStatus } from '~/models/error'
import { commonService } from '~/common/common.service'
import { FamilyLinkStatus, UserRole } from '@prisma/client'

// Middleware to validate assessment ID
export const assessmentIdValidator = async (req: Request, res: Response, next: NextFunction) => {
  const { assessment_id } = req.params
  if (!assessment_id) {
    throw new ErrorWithStatus({
      message: 'Assessment ID is required',
      status: HTTP_STATUS.BAD_REQUEST
    })
  }
  next()
}

// Middleware to validate request body
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg)
    throw new ErrorWithStatus({
      message: errorMessages.join(', '),
      status: HTTP_STATUS.BAD_REQUEST
    })
  }
  next()
}

export const healthSummaryAccessValidator = async (req: Request, res: Response, next: NextFunction) => {
  const { resident_id } = req.params
  if (!resident_id) {
    throw new ErrorWithStatus({
      message: 'Resident id is required',
      status: HTTP_STATUS.BAD_REQUEST
    })
  }

  const resident = await commonService.getResidentById(resident_id)
  if (!resident) {
    throw new ErrorWithStatus({
      message: 'Resident not found',
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  const userRole = req.decoded_authorization?.role as UserRole
  const institution_id = req.decoded_authorization?.institution_id as string | undefined
  const user_id = req.decoded_authorization?.user_id as string

  if (userRole === UserRole.Family) {
    const link = await commonService.getFamilyResidentLink(user_id, resident_id)
    if (!link || link.status !== FamilyLinkStatus.active) {
      throw new ErrorWithStatus({
        message: 'Resident is not linked to this family member',
        status: HTTP_STATUS.FORBIDDEN
      })
    }
  } else if (
    userRole !== UserRole.PlatformSuperAdmin &&
    userRole !== UserRole.RootAdmin &&
    userRole !== UserRole.Resident
  ) {
    if (!institution_id || resident.institution_id !== institution_id) {
      throw new ErrorWithStatus({
        message: 'Resident mismatch institution',
        status: HTTP_STATUS.FORBIDDEN
      })
    }
  }

  ;(req as Request & { resident?: typeof resident }).resident = resident
  next()
}
