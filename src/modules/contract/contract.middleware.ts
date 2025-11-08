import { Request, Response, NextFunction } from 'express'
import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { UserRole } from '@prisma/client'
import { validationResult } from 'express-validator'

export const contractIdValidator = async (req: Request, res: Response, next: NextFunction) => {
  const { contract_id } = req.params

  const contract = await prisma.contract.findUnique({
    where: { contract_id }
  })

  if (!contract) {
    throw new ErrorWithStatus({
      message: 'Contract not found',
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  next()
}

export const isContractBelongsToInstitution = async (req: Request, res: Response, next: NextFunction) => {
  const { contract_id } = req.params
  const { institution_id } = req.decoded_authorization as any

  const contract = await prisma.contract.findUnique({
    where: { contract_id }
  })

  if (!contract) {
    throw new ErrorWithStatus({
      message: 'Contract not found',
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  if (contract.institution_id !== institution_id) {
    throw new ErrorWithStatus({
      message: 'You do not have permission to access this contract',
      status: HTTP_STATUS.FORBIDDEN
    })
  }

  next()
}

export const residentIdValidator = async (req: Request, res: Response, next: NextFunction) => {
  const { resident_id } = req.params

  const resident = await prisma.resident.findUnique({
    where: { resident_id }
  })

  if (!resident) {
    throw new ErrorWithStatus({
      message: 'Resident not found',
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  next()
}

export const contractServiceIdValidator = async (req: Request, res: Response, next: NextFunction) => {
  const { contract_service_id } = req.params

  const contractService = await prisma.contractService.findUnique({
    where: { contract_service_id }
  })

  if (!contractService) {
    throw new ErrorWithStatus({
      message: 'Contract service not found',
      status: HTTP_STATUS.NOT_FOUND
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

export const canAccessContract = async (req: Request, res: Response, next: NextFunction) => {
  const { contract_id } = req.params
  const { user_id, role, institution_id } = req.decoded_authorization as any

  const contract = await prisma.contract.findUnique({
    where: { contract_id }
  })

  if (!contract) {
    throw new ErrorWithStatus({
      message: 'Contract not found',
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  // Admin and Staff can access all contracts in their institution
  if ([UserRole.RootAdmin, UserRole.Admin, UserRole.Staff].includes(role)) {
    if (contract.institution_id !== institution_id) {
      throw new ErrorWithStatus({
        message: 'You do not have permission to access this contract',
        status: HTTP_STATUS.FORBIDDEN
      })
    }
    return next()
  }

  // Family can only access their own contracts
  if (role === UserRole.Family) {
    if (contract.family_user_id !== user_id) {
      throw new ErrorWithStatus({
        message: 'You do not have permission to access this contract',
        status: HTTP_STATUS.FORBIDDEN
      })
    }
    return next()
  }

  // Resident can access their own contract
  if (role === UserRole.Resident) {
    const resident = await prisma.resident.findFirst({
      where: { user_id }
    })

    if (!resident || contract.resident_id !== resident.resident_id) {
      throw new ErrorWithStatus({
        message: 'You do not have permission to access this contract',
        status: HTTP_STATUS.FORBIDDEN
      })
    }
    return next()
  }

  throw new ErrorWithStatus({
    message: 'You do not have permission to access this contract',
    status: HTTP_STATUS.FORBIDDEN
  })
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
