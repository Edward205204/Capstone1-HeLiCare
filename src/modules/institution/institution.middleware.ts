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
import { UserRole } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import makePatchSchema from '~/utils/make_path_schema'

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
      institution_id: institutionIdSchema
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
