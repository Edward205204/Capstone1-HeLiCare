import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import { NextFunction, Request, Response } from 'express'
import { UserRole } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'

// Middleware kiểm tra quyền family
export const isHandleByFamily = (req: Request, res: Response, next: NextFunction) => {
  if (req.decoded_authorization?.role !== UserRole.Family) {
    return next(
      new ErrorWithStatus({
        message: 'You are not authorized to perform this action. Only Family can submit feedback.',
        status: HTTP_STATUS.UNAUTHORIZED
      })
    )
  }
  next()
}

// Middleware kiểm tra quyền admin/staff
export const isHandleByAdminOrStaff = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.decoded_authorization?.role !== UserRole.Admin &&
    req.decoded_authorization?.role !== UserRole.RootAdmin &&
    req.decoded_authorization?.role !== UserRole.Staff
  ) {
    return next(
      new ErrorWithStatus({
        message: 'You are not authorized to perform this action. Only Admin, RootAdmin and Staff can manage feedback.',
        status: HTTP_STATUS.UNAUTHORIZED
      })
    )
  }
  next()
}

// Validator cho create feedback
export const createFeedbackValidator = validate(
  checkSchema({
    category_id: {
      notEmpty: {
        errorMessage: 'Category ID is required'
      },
      isString: {
        errorMessage: 'Category ID must be a string'
      }
    },
    message: {
      notEmpty: {
        errorMessage: 'Message is required'
      },
      isString: {
        errorMessage: 'Message must be a string'
      },
      isLength: {
        options: {
          min: 10,
          max: 5000
        },
        errorMessage: 'Message must be between 10 and 5000 characters'
      }
    },
    resident_id: {
      optional: true,
      isString: {
        errorMessage: 'Resident ID must be a string'
      }
    },
    type: {
      optional: true,
      isString: {
        errorMessage: 'Type must be a string'
      }
    },
    attachments: {
      optional: true,
      isArray: {
        errorMessage: 'Attachments must be an array'
      }
    },
    'attachments.*': {
      optional: true,
      isString: {
        errorMessage: 'Each attachment must be a string URL'
      }
    }
  })
)

// Validator cho update feedback
export const updateFeedbackValidator = validate(
  checkSchema({
    status: {
      optional: true,
      isIn: {
        options: [['pending', 'in_progress', 'resolved']],
        errorMessage: 'Status must be one of: pending, in_progress, resolved'
      }
    },
    staff_notes: {
      optional: true,
      isString: {
        errorMessage: 'Staff notes must be a string'
      },
      isLength: {
        options: {
          max: 2000
        },
        errorMessage: 'Staff notes must be less than 2000 characters'
      }
    },
    assigned_staff_id: {
      optional: true,
      isString: {
        errorMessage: 'Assigned staff ID must be a string'
      }
    },
    type: {
      optional: true,
      isString: {
        errorMessage: 'Type must be a string'
      }
    }
  })
)
