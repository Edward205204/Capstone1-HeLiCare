import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import { NextFunction, Request, Response } from 'express'
import { UserRole } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  residentIdSchema,
  billingCycleSchema,
  amountSchema,
  nextBillingDateSchema,
  startDateSchema,
  isActiveSchema,
  contractIdSchema
} from './service-contract.schema'
import makePatchSchema from '~/utils/make_path_schema'

// Middleware kiểm tra quyền Admin/Staff
export const isHandleByAdminOrStaff = (req: Request, res: Response, next: NextFunction) => {
  const role = req.decoded_authorization?.role
  if (role !== UserRole.Admin && role !== UserRole.RootAdmin && role !== UserRole.Staff) {
    return next(
      new ErrorWithStatus({
        message: 'You are not authorized to perform this action. Only Admin and Staff can manage service contracts.',
        status: HTTP_STATUS.FORBIDDEN
      })
    )
  }
  next()
}

// Middleware kiểm tra quyền Family
export const isHandleByFamily = (req: Request, res: Response, next: NextFunction) => {
  if (req.decoded_authorization?.role !== UserRole.Family) {
    return next(
      new ErrorWithStatus({
        message: 'You are not authorized to perform this action. Only Family can view their service contracts.',
        status: HTTP_STATUS.FORBIDDEN
      })
    )
  }
  next()
}

// Validator cho tạo hợp đồng
export const createServiceContractValidator = validate(
  checkSchema({
    resident_id: residentIdSchema,
    billing_cycle: billingCycleSchema,
    amount: amountSchema,
    next_billing_date: nextBillingDateSchema,
    start_date: startDateSchema
  })
)

// Validator cho cập nhật hợp đồng
export const updateServiceContractValidator = validate(
  checkSchema(
    makePatchSchema({
      billing_cycle: billingCycleSchema,
      amount: {
        ...amountSchema,
        optional: true
      },
      next_billing_date: {
        ...nextBillingDateSchema,
        optional: true
      },
      is_active: isActiveSchema
    })
  )
)

// Validator cho contract ID param
export const contractIdParamValidator = validate(
  checkSchema(
    {
      id: contractIdSchema
    },
    ['params']
  )
)
