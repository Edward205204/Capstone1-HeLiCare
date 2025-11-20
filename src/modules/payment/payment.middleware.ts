import { Request, Response, NextFunction } from 'express'
import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { UserRole } from '@prisma/client'
import { validationResult } from 'express-validator'

export const paymentIdValidator = async (req: Request, res: Response, next: NextFunction) => {
  const { payment_id } = req.params

  const payment = await prisma.payment.findUnique({
    where: { payment_id }
  })

  if (!payment) {
    throw new ErrorWithStatus({
      message: 'Payment not found',
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  next()
}

export const isPaymentBelongsToInstitution = async (req: Request, res: Response, next: NextFunction) => {
  const { payment_id } = req.params
  const { institution_id } = req.decoded_authorization as any

  const payment = await prisma.payment.findUnique({
    where: { payment_id }
  })

  if (!payment) {
    throw new ErrorWithStatus({
      message: 'Payment not found',
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  if (payment.institution_id !== institution_id) {
    throw new ErrorWithStatus({
      message: 'You do not have permission to access this payment',
      status: HTTP_STATUS.FORBIDDEN
    })
  }

  next()
}

export const canAccessPayment = async (req: Request, res: Response, next: NextFunction) => {
  const { payment_id } = req.params
  const { user_id, role, institution_id } = req.decoded_authorization as any

  const payment = await prisma.payment.findUnique({
    where: { payment_id }
  })

  if (!payment) {
    throw new ErrorWithStatus({
      message: 'Payment not found',
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  // Admin and Staff can access all payments in their institution
  if ([UserRole.RootAdmin, UserRole.Admin, UserRole.Staff].includes(role)) {
    if (payment.institution_id !== institution_id) {
      throw new ErrorWithStatus({
        message: 'You do not have permission to access this payment',
        status: HTTP_STATUS.FORBIDDEN
      })
    }
    return next()
  }

  // Family can only access their own payments
  if (role === UserRole.Family) {
    if (payment.family_user_id !== user_id) {
      throw new ErrorWithStatus({
        message: 'You do not have permission to access this payment',
        status: HTTP_STATUS.FORBIDDEN
      })
    }
    return next()
  }

  throw new ErrorWithStatus({
    message: 'You do not have permission to access this payment',
    status: HTTP_STATUS.FORBIDDEN
  })
}

export const isAdminOrStaff = async (req: Request, res: Response, next: NextFunction) => {
  const { role } = req.decoded_authorization as any

  if (![UserRole.RootAdmin, UserRole.Admin, UserRole.Staff].includes(role)) {
    throw new ErrorWithStatus({
      message: 'Only Admin or Staff can perform this action',
      status: HTTP_STATUS.FORBIDDEN
    })
  }

  next()
}

export const isAdminOnly = async (req: Request, res: Response, next: NextFunction) => {
  const { role } = req.decoded_authorization as any

  if (![UserRole.RootAdmin, UserRole.Admin].includes(role)) {
    throw new ErrorWithStatus({
      message: 'Only Admin can perform this action',
      status: HTTP_STATUS.FORBIDDEN
    })
  }

  next()
}

export const isFamilyOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const { role } = req.decoded_authorization as any

  if (![UserRole.Family, UserRole.RootAdmin, UserRole.Admin].includes(role)) {
    throw new ErrorWithStatus({
      message: 'Only Family or Admin can perform this action',
      status: HTTP_STATUS.FORBIDDEN
    })
  }

  next()
}

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

