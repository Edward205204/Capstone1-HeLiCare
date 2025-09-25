import { NextFunction, Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import omit from 'lodash/omit'
import { ErrorWithStatus } from '~/models/error'

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
