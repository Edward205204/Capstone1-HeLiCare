import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { HTTP_STATUS } from '~/constants/http_status'
import { ErrorWithStatus } from '~/models/error'

// Middleware to validate request body/params/query
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
