import { Request, Response, NextFunction } from 'express'
import { ValidationChain, validationResult } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema'
import { HTTP_STATUS } from '../constants/http_status'
import { EntityError, ErrorWithStatus } from '~/models/error'
export const validate = (validations: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await validations.run(req)
    const errors = validationResult(req)
    if (errors.isEmpty()) return next()

    const errorObject = errors.mapped()
    const entityError = new EntityError({ errors: {} })
    for (const key in errorObject) {
      // msg nếu được throw new Error thì nó có value là string, còn throw từ ErrorWithStatus thì nó có value là ErrorWithStatus và nhảy vào điều kiện if
      const { msg } = errorObject[key]
      // Check if the error is an instance of ErrorWithStatus
      // and if the status is not UNPROCESSABLE_ENTITY - 422
      if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        return next(msg)
      }

      // If the error is entity error, add it to the entityErrors object
      entityError.errors[key] = {
        ...errorObject[key],
        msg
      }
    }

    next(new EntityError(entityError))
  }
}
