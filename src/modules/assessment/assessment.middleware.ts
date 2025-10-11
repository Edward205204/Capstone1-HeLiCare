import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { HTTP_STATUS } from '~/constants/http_status'
import { ErrorWithStatus } from '~/models/error'

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
