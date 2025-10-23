import { NextFunction, Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import omit from 'lodash/omit'
import { ErrorWithStatus } from '~/models/error'
import { UserRole } from '@prisma/client'

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

export const isHandleByInstitutionAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.decoded_authorization?.role !== UserRole.Admin && req.decoded_authorization?.role !== UserRole.RootAdmin) {
    return next(
      new ErrorWithStatus({ message: 'You are not authorized to update institution', status: HTTP_STATUS.UNAUTHORIZED })
    )
  }
  next()
}

export const isHandleByRootFlatformAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.decoded_authorization?.role !== UserRole.PlatformSuperAdmin) {
    return next(
      new ErrorWithStatus({ message: 'You are not authorized to create institution', status: HTTP_STATUS.UNAUTHORIZED })
    )
  }
  next()
}
