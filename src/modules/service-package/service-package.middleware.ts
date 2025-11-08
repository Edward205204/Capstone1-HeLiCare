import { Request, Response, NextFunction } from 'express'
import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { UserRole } from '@prisma/client'
import { validationResult } from 'express-validator'

export const packageIdValidator = async (req: Request, res: Response, next: NextFunction) => {
  const { package_id } = req.params

  const servicePackage = await prisma.servicePackage.findUnique({
    where: { package_id }
  })

  if (!servicePackage) {
    throw new ErrorWithStatus({
      message: 'Service package not found',
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  next()
}

export const isPackageBelongsToInstitution = async (req: Request, res: Response, next: NextFunction) => {
  const { package_id } = req.params
  const { institution_id } = req.decoded_authorization as any

  const servicePackage = await prisma.servicePackage.findUnique({
    where: { package_id }
  })

  if (!servicePackage) {
    throw new ErrorWithStatus({
      message: 'Service package not found',
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  if (servicePackage.institution_id !== institution_id) {
    throw new ErrorWithStatus({
      message: 'You do not have permission to access this service package',
      status: HTTP_STATUS.FORBIDDEN
    })
  }

  next()
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
