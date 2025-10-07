import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import {
  institutionAddressSchema,
  institutionContactInfoCreateSchema,
  institutionContactInfoPatchSchema,
  institutionIdSchema,
  institutionNameSchema
} from './institution.schema'
import { NextFunction, Request, Response } from 'express'
import { InstitutionContractStatus, UserRole } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import makePatchSchema from '~/utils/make_path_schema'
import { commonService } from '~/common/common.service'

export const createInstitutionValidator = validate(
  checkSchema(
    {
      name: institutionNameSchema,
      address: institutionAddressSchema,
      contact_info: institutionContactInfoCreateSchema
    },
    ['body']
  )
)

export const isHandleByRootFlatformAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.decoded_authorization?.role !== UserRole.PlatformSuperAdmin) {
    return next(
      new ErrorWithStatus({ message: 'You are not authorized to create institution', status: HTTP_STATUS.UNAUTHORIZED })
    )
  }
  next()
}

export const institutionIdValidator = validate(
  checkSchema(
    {
      institution_id: {
        ...institutionIdSchema,
        custom: {
          options: async (value, { req }) => {
            const institution = await commonService.getInstitutionById(value)
            if (!institution) {
              throw new ErrorWithStatus({
                message: 'Institution not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            if (institution.status !== InstitutionContractStatus.active) {
              throw new ErrorWithStatus({
                message: 'Institution is not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            return true
          }
        }
      }
    },
    ['params']
  )
)

// có thể update all
export const updateInstitutionValidator = validate(
  checkSchema(
    makePatchSchema({
      name: institutionNameSchema,
      address: institutionAddressSchema,
      contact_info: institutionContactInfoPatchSchema
    }),
    ['body']
  )
)

export const isHandleByInstitutionAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.decoded_authorization?.role !== UserRole.Admin && req.decoded_authorization?.role !== UserRole.RootAdmin) {
    return next(
      new ErrorWithStatus({ message: 'You are not authorized to update institution', status: HTTP_STATUS.UNAUTHORIZED })
    )
  }
  next()
}
