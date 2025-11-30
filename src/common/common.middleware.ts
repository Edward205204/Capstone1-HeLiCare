import { NextFunction, Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import omit from 'lodash/omit'
import { ErrorWithStatus } from '~/models/error'
import { UserRole, FamilyLinkStatus } from '@prisma/client'
import { prisma } from '~/utils/db'

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

// Middleware cho phép staff hoặc family user (family phải có resident link)
export const isHandleByStaffOrFamilyValidator = async (req: Request, res: Response, next: NextFunction) => {
  const role = req.decoded_authorization?.role
  const user_id = req.decoded_authorization?.user_id as string

  // Staff/Admin luôn được phép
  if (role === UserRole.Staff || role === UserRole.RootAdmin || role === UserRole.Admin) {
    return next()
  }

  // Family user cần kiểm tra resident link
  if (role === UserRole.Family) {
    if (!user_id) {
      return next(
        new ErrorWithStatus({
          message: 'User ID not found in token',
          status: HTTP_STATUS.UNAUTHORIZED
        })
      )
    }

    // Kiểm tra xem family user có resident link không

    const familyLink = await prisma.familyResidentLink.findFirst({
      where: {
        family_user_id: user_id,
        status: FamilyLinkStatus.active
      },
      include: {
        resident: {
          select: {
            institution_id: true
          }
        }
      }
    })

    if (!familyLink || !familyLink.resident.institution_id) {
      return next(
        new ErrorWithStatus({
          message: 'No active resident link found. Please link to a resident first.',
          status: HTTP_STATUS.FORBIDDEN
        })
      )
    }

    // Lưu institution_id vào request để controller sử dụng
    ;(req as any).family_institution_id = familyLink.resident.institution_id
    return next()
  }

  // Các role khác không được phép
  return next(
    new ErrorWithStatus({
      message: 'You are not authorized to access this resource',
      status: HTTP_STATUS.FORBIDDEN
    })
  )
}

// Middleware cho Resident role
export const isHandleByResidentValidator = async (req: Request, res: Response, next: NextFunction) => {
  const role = req.decoded_authorization?.role
  const user_id = req.decoded_authorization?.user_id as string

  if (role !== UserRole.Resident) {
    return next(
      new ErrorWithStatus({
        message: 'You are not authorized to access this resource as a Resident',
        status: HTTP_STATUS.FORBIDDEN
      })
    )
  }

  if (!user_id) {
    return next(
      new ErrorWithStatus({
        message: 'User ID not found in token',
        status: HTTP_STATUS.UNAUTHORIZED
      })
    )
  }

  // Find the resident linked to this user_id
  const resident = await prisma.resident.findUnique({
    where: { user_id },
    select: { resident_id: true, institution_id: true }
  })

  if (!resident) {
    return next(
      new ErrorWithStatus({
        message: 'Resident profile not found for this user',
        status: HTTP_STATUS.NOT_FOUND
      })
    )
  }

  // Attach resident_id and institution_id to the request for downstream use
  ;(req as any).resident_id = resident.resident_id
  ;(req as any).institution_id = resident.institution_id

  next()
}
