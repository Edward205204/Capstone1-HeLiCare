import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import { NextFunction, Request, Response } from 'express'
import { UserRole, VisitStatus } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { commonService } from '~/common/common.service'
import makePatchSchema from '~/utils/make_path_schema'
import {
  residentIdSchema,
  visitDateSchema,
  visitTimeSchema,
  durationSchema,
  purposeSchema,
  visitNotesSchema,
  visitIdSchema,
  visitStatusSchema,
  dateQuerySchema,
  institutionIdQuerySchema
} from './visit.schema'

// Middleware kiểm tra quyền family
export const isHandleByFamily = (req: Request, res: Response, next: NextFunction) => {
  if (req.decoded_authorization?.role !== UserRole.Family) {
    return next(
      new ErrorWithStatus({
        message: 'You are not authorized to perform this action. Only Family can manage visits.',
        status: HTTP_STATUS.UNAUTHORIZED
      })
    )
  }
  next()
}

// Middleware kiểm tra quyền admin/staff để duyệt lịch hẹn
export const isHandleByAdminOrStaff = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.decoded_authorization?.role !== UserRole.Admin &&
    req.decoded_authorization?.role !== UserRole.RootAdmin &&
    req.decoded_authorization?.role !== UserRole.Staff
  ) {
    return next(
      new ErrorWithStatus({
        message: 'You are not authorized to perform this action. Only Admin, RootAdmin and Staff can approve visits.',
        status: HTTP_STATUS.UNAUTHORIZED
      })
    )
  }
  next()
}

// Validator cho tạo lịch hẹn thăm viếng
export const createVisitValidator = validate(
  checkSchema(
    {
      resident_id: {
        ...residentIdSchema,
        custom: {
          options: async (value, { req }) => {
            const resident = await commonService.getResidentById(value)
            if (!resident) {
              throw new ErrorWithStatus({
                message: 'Resident not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }

            // Kiểm tra family có quyền thăm resident này không
            const familyLink = await commonService.getFamilyResidentLink(req.decoded_authorization?.user_id, value)
            if (!familyLink || familyLink.status !== 'active') {
              throw new ErrorWithStatus({
                message: 'You are not authorized to visit this resident',
                status: HTTP_STATUS.FORBIDDEN
              })
            }

            return true
          }
        }
      },
      visit_date: visitDateSchema,
      visit_time: visitTimeSchema,
      duration: durationSchema,
      purpose: purposeSchema,
      notes: visitNotesSchema
    },
    ['body']
  )
)

// Validator cho cập nhật lịch hẹn
export const updateVisitValidator = validate(
  checkSchema(
    makePatchSchema({
      visit_date: visitDateSchema,
      visit_time: visitTimeSchema,
      duration: durationSchema,
      purpose: purposeSchema,
      notes: visitNotesSchema
    }),
    ['body']
  )
)

// Validator cho visit_id trong params
export const visitIdValidator = validate(
  checkSchema(
    {
      visit_id: {
        ...visitIdSchema,
        custom: {
          options: async (value, { req }) => {
            const visit = await commonService.getVisitById(value)
            if (!visit) {
              throw new ErrorWithStatus({
                message: 'Visit not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }

            // Kiểm tra quyền truy cập
            if (req.decoded_authorization?.role === UserRole.Family) {
              if (visit.family_user_id !== req.decoded_authorization?.user_id) {
                throw new ErrorWithStatus({
                  message: 'You are not authorized to access this visit',
                  status: HTTP_STATUS.FORBIDDEN
                })
              }
            }

            return true
          }
        }
      }
    },
    ['params']
  )
)

// Validator cho duyệt lịch hẹn
export const approveVisitValidator = validate(
  checkSchema(
    {
      status: visitStatusSchema,
      notes: visitNotesSchema
    },
    ['body']
  )
)

// Validator cho query parameters
export const getVisitsByDateValidator = validate(
  checkSchema(
    {
      date: dateQuerySchema,
      institution_id: institutionIdQuerySchema
    },
    ['query']
  )
)

export const getVisitsByFamilyValidator = validate(
  checkSchema(
    {
      status: {
        optional: true,
        isIn: {
          options: [Object.values(VisitStatus)],
          errorMessage: 'Invalid visit status'
        }
      },
      limit: {
        optional: true,
        isInt: {
          options: {
            min: 1,
            max: 100
          },
          errorMessage: 'Limit must be between 1 and 100'
        }
      },
      offset: {
        optional: true,
        isInt: {
          options: {
            min: 0
          },
          errorMessage: 'Offset must be a non-negative integer'
        }
      }
    },
    ['query']
  )
)

// Validator cho check availability
export const checkAvailabilityValidator = validate(
  checkSchema(
    {
      institution_id: {
        notEmpty: {
          errorMessage: 'Institution ID is required'
        },
        isUUID: {
          errorMessage: 'Institution ID must be a valid UUID'
        }
      },
      date: {
        notEmpty: {
          errorMessage: 'Date is required'
        },
        isISO8601: {
          errorMessage: 'Date must be in ISO 8601 format'
        }
      }
    },
    ['query']
  )
)

// Validator cho check-in
export const checkInValidator = validate(
  checkSchema(
    {
      qr_code_data: {
        notEmpty: {
          errorMessage: 'QR code data is required'
        },
        isString: {
          errorMessage: 'QR code data must be a string'
        }
      }
    },
    ['body']
  )
)

// Validator cho check-out
export const checkOutValidator = validate(
  checkSchema(
    {
      visit_id: {
        notEmpty: {
          errorMessage: 'Visit ID is required'
        },
        isUUID: {
          errorMessage: 'Visit ID must be a valid UUID'
        }
      }
    },
    ['body']
  )
)

// Validator cho cancel visit
export const cancelVisitValidator = validate(
  checkSchema(
    {
      visit_id: {
        notEmpty: {
          errorMessage: 'Visit ID is required'
        },
        isUUID: {
          errorMessage: 'Visit ID must be a valid UUID'
        }
      },
      reason: {
        optional: true,
        isString: {
          errorMessage: 'Reason must be a string'
        },
        isLength: {
          options: {
            max: 500
          },
          errorMessage: 'Reason must be less than 500 characters'
        }
      }
    },
    ['body']
  )
)
