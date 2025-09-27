import { StaffPosition, UserRole } from '@prisma/client'
import { ParamSchema } from 'express-validator'
import capitalize from 'lodash/capitalize'
import { JsonWebTokenError } from 'jsonwebtoken'
import { commonService } from '~/common/common.service'
import { HTTP_STATUS } from '~/constants/http_status'
import { ErrorWithStatus } from '~/models/error'
import { verifyToken } from '~/utils/jwt'

export const emailSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Email is required'
  },
  isEmail: {
    errorMessage: 'Email is invalid'
  },
  trim: true
}

export const isStrongPasswordSchema: ParamSchema = {
  isStrongPassword: {
    options: { minLength: 6, minUppercase: 1, minLowercase: 1, minNumbers: 1, minSymbols: 1 },
    errorMessage: 'Password must be strong'
  }
}

export const passwordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Password is required'
  },
  isString: {
    errorMessage: 'Password must be a string'
  },
  trim: true
}

export const confirmPasswordSchema: ParamSchema = {
  ...passwordSchema,
  custom: {
    options: (value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Confirm password must be the same as password')
      }
      return true
    }
  }
}

export const userRoleSchema: ParamSchema = {
  isIn: {
    options: [
      [
        UserRole.PlatformSuperAdmin,
        UserRole.RootAdmin,
        UserRole.Admin,
        UserRole.Staff,
        UserRole.Family,
        UserRole.Resident
      ]
    ],
    errorMessage: 'User role is invalid'
  }
}

export const forgotPasswordTokenSchema: ParamSchema = {
  custom: {
    options: async (value: string, { req }) => {
      if (!value) {
        throw new ErrorWithStatus({
          message: 'Forgot password token is required',
          status: HTTP_STATUS.UNAUTHORIZED
        })
      }
      try {
        const decoded_forgot_password_token = await verifyToken({
          token: value,
          secretOrPublicKey: process.env.JWT_SECRET_KEY_COMMON_TOKEN as string
        })

        const { user_id } = decoded_forgot_password_token
        const user = await commonService.getUserById(user_id as string)
        if (!user) {
          throw new ErrorWithStatus({
            message: 'Forgot password token is invalid',
            status: HTTP_STATUS.NOT_FOUND
          })
        }

        const userToken = await commonService.getUserTokenByTokenString({
          token_string: value
        })

        if (!userToken) {
          throw new ErrorWithStatus({
            message: 'Forgot password token is invalid',
            status: HTTP_STATUS.NOT_FOUND
          })
        }

        req.user = user
      } catch (error) {
        throw new ErrorWithStatus({
          message: capitalize((error as JsonWebTokenError).message),
          status: HTTP_STATUS.UNAUTHORIZED
        })
      }
      return true
    }
  }
}

export const institutionIdSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Institution ID is required'
  },
  isUUID: {
    errorMessage: 'Institution ID must be a valid UUID'
  },
  trim: true
}

export const fullNameSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Full name is required'
  },
  isString: {
    errorMessage: 'Full name must be a string'
  },
  trim: true
}

export const phoneSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Phone is required'
  },
  isString: {
    errorMessage: 'Phone must be a string'
  },
  matches: {
    options: /^0[0-9]{9}$/,
    errorMessage: 'Phone must be a valid phone number'
  },
  trim: true
}

export const businessIdSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Business ID is required'
  },
  isString: {
    errorMessage: 'Business ID must be a string'
  },
  trim: true
}

export const hireDateSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Hire date is required'
  },
  isDate: {
    errorMessage: 'Hire date must be a date'
  },
  trim: true
}

export const notesSchema: ParamSchema = {
  isString: {
    errorMessage: 'Notes must be a string'
  },
  trim: true
}

export const positionSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Position is required'
  },
  isIn: {
    options: [
      [
        StaffPosition.NURSE,
        StaffPosition.CAREGIVER,
        StaffPosition.THERAPIST,
        StaffPosition.PHYSICIAN,
        StaffPosition.SOCIAL_WORKER,
        StaffPosition.ACTIVITY_COORDINATOR,
        StaffPosition.DIETITIAN,
        StaffPosition.OTHER
      ]
    ]
  }
}
