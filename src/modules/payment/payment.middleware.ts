import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import { NextFunction, Request, Response } from 'express'
import { UserRole } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  contractIdSchema,
  paymentMethodSchema,
  amountSchema,
  periodStartSchema,
  periodEndSchema,
  notesSchema,
  paymentIdSchema,
  statusSchema,
  transactionRefSchema,
  proofImageUrlSchema
} from './payment.schema'
import makePatchSchema from '~/utils/make_path_schema'

// Middleware kiểm tra quyền Admin/Staff
export const isHandleByAdminOrStaff = (req: Request, res: Response, next: NextFunction) => {
  const role = req.decoded_authorization?.role
  if (role !== UserRole.Admin && role !== UserRole.RootAdmin && role !== UserRole.Staff) {
    return next(
      new ErrorWithStatus({
        message: 'You are not authorized to perform this action. Only Admin and Staff can manage payments.',
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
        message: 'You are not authorized to perform this action. Only Family can create payments.',
        status: HTTP_STATUS.FORBIDDEN
      })
    )
  }
  next()
}

// Validator cho tạo payment
export const createPaymentValidator = validate(
  checkSchema({
    contract_id: contractIdSchema,
    payment_method: paymentMethodSchema,
    amount: amountSchema,
    period_start: periodStartSchema,
    period_end: periodEndSchema,
    notes: notesSchema
  })
)

// Validator cho cập nhật payment
export const updatePaymentValidator = validate(
  checkSchema(
    makePatchSchema({
      status: statusSchema,
      transaction_ref: transactionRefSchema,
      notes: notesSchema
    })
  )
)

// Validator cho upload proof
export const uploadProofValidator = validate(
  checkSchema({
    proof_image_url: proofImageUrlSchema,
    transaction_ref: {
      ...transactionRefSchema,
      optional: true
    },
    notes: notesSchema
  })
)

// Validator cho payment ID param
export const paymentIdParamValidator = validate(
  checkSchema(
    {
      id: paymentIdSchema
    },
    ['params']
  )
)

// Validator cho VNPay create payment
export const createVNPayPaymentValidator = validate(
  checkSchema({
    contract_id: contractIdSchema,
    period_start: periodStartSchema,
    period_end: periodEndSchema
  })
)
