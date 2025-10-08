import { checkSchema } from 'express-validator'
import { commonService } from '~/common/common.service'
import { validate } from '~/utils/validate'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { NextFunction, Request, Response } from 'express'
import { UserRole } from '@prisma/client'

export const residentIdSchema = {
  notEmpty: {
    errorMessage: 'Resident id is required'
  },
  isUUID: {
    errorMessage: 'Resident id must be a valid UUID'
  },
  custom: {
    options: async (value: string, { req }: any) => {
      const resident = await commonService.getResidentById(value)
      if (!resident) {
        throw new ErrorWithStatus({ message: 'Resident not found', status: HTTP_STATUS.NOT_FOUND })
      }
      if (resident.institution_id !== req.decoded_authorization?.institution_id) {
        throw new ErrorWithStatus({
          message: 'Resident mismatch institution',
          status: HTTP_STATUS.FORBIDDEN
        })
      }
      return true
    }
  },
  trim: true
}

export const residentIdValidator = validate(
  checkSchema(
    {
      resident_id: residentIdSchema
    },
    ['params']
  )
)

export const isHandleByStaffValidator = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.decoded_authorization?.role !== UserRole.Staff &&
    req.decoded_authorization?.role !== UserRole.RootAdmin &&
    req.decoded_authorization?.role !== UserRole.Admin
  ) {
    return next(
      new ErrorWithStatus({
        message: 'You are not authorized to access this resource',
        status: HTTP_STATUS.FORBIDDEN
      })
    )
  }
  next()
}
