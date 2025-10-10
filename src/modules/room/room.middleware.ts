import { NextFunction, Request, Response } from 'express'
import { validate } from '~/utils/validate'
import { HTTP_STATUS } from '~/constants/http_status'
import { ErrorWithStatus } from '~/models/error'
import { UserRole } from '@prisma/client'
import { checkSchema } from 'express-validator'
import { createRoomSchema, roomIdSchema, updateRoomSchema } from './room.schema'
import { commonService } from '~/common/common.service'

export const isHandleByInstitutionAdminOrRoot = (req: Request, res: Response, next: NextFunction) => {
  if (req.decoded_authorization?.role !== UserRole.Admin && req.decoded_authorization?.role !== UserRole.RootAdmin) {
    return next(new ErrorWithStatus({ message: 'Bạn không có quyền thao tác phòng', status: HTTP_STATUS.FORBIDDEN }))
  }
  next()
}

export const mustMatchInstitutionParam = (req: Request, res: Response, next: NextFunction) => {
  const paramInstitutionId = req.params.institution_id
  const tokenInstitutionId = req.decoded_authorization?.institution_id
  if (!tokenInstitutionId || tokenInstitutionId !== paramInstitutionId) {
    return next(new ErrorWithStatus({ message: 'Institution scope mismatch', status: HTTP_STATUS.FORBIDDEN }))
  }
  next()
}

export const institutionIdParamValidator = validate(
  checkSchema(
    {
      institution_id: {
        in: ['params'],
        isUUID: {
          errorMessage: 'Invalid institution_id'
        },
        custom: {
          options: async (value) => {
            const institution = await commonService.getInstitutionById(value)
            if (!institution) {
              throw new ErrorWithStatus({ message: 'Institution not found', status: HTTP_STATUS.NOT_FOUND })
            }
            return true
          }
        }
      }
    },
    ['params']
  )
)

export const createRoomValidator = validate(createRoomSchema)
export const updateRoomValidator = validate(updateRoomSchema)
export const roomIdValidator = validate(checkSchema(roomIdSchema, ['params']))

export const addResidentToRoomValidator = validate(
  checkSchema(
    {
      resident_id: {
        in: ['body'],
        isUUID: {
          errorMessage: 'Invalid resident_id'
        }
      }
    },
    ['body']
  )
)


