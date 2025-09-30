import { NextFunction, Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import omit from 'lodash/omit'
import { ErrorWithStatus } from '~/models/error'
import { UserRole } from '@prisma/client'
import { validate } from '~/utils/validate'
import { checkSchema } from 'express-validator'
import {
  institutionAddressSchema,
  institutionContactInfoSchema,
  institutionIdSchema,
  institutionNameSchema
} from '~/modules/institution/institution.schema'
import makePatchSchema from '~/utils/make_path_schema'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const defaultErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ErrorWithStatus) {
    res.status(err.status).json(omit(err, ['status']))
    return
  }
  Object.getOwnPropertyNames(err).forEach((key) => {
    Object.defineProperty(err, key, {
      enumerable: true
    })
  })
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    message: err.message,
    errorInfo: omit(err, ['stack'])
  })
}

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

export const updateInstitutionValidator = validate(
  checkSchema(
    makePatchSchema({
      name: institutionNameSchema,
      address: institutionAddressSchema,
      contact_info: institutionContactInfoSchema
    }),
    ['body']
  )
)
