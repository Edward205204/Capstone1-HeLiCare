import { ParamSchema } from 'express-validator'
import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import { verifyPassword } from '~/utils/hash'
import { commonService } from '~/common/common.service'
import { UserRole } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { accessTokenDecode } from '~/utils/access_token_decode'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import capitalize from 'lodash/capitalize'
import { Request } from 'express'
import { AccessTokenPayload, EmailVerifyTokenReqBody, RefreshTokenPayload } from './auth.dto'
import { verifyToken } from '~/utils/jwt'
import { TokenType } from '~/constants/token_type'

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
      UserRole.PlatformSuperAdmin,
      UserRole.RootAdmin,
      UserRole.Admin,
      UserRole.MedicalStaff,
      UserRole.CareStaff,
      UserRole.ReceptionStaff,
      UserRole.Family,
      UserRole.Resident
    ],
    errorMessage: 'User role is invalid'
  }
}

export const loginValidator = validate(
  checkSchema(
    {
      email: {
        ...emailSchema,
        custom: {
          options: async (value, { req }) => {
            const user = await commonService.checkEmailExist(value)
            if (!user) {
              throw new Error('Email is not existed')
            }
            const isValidPassword = await verifyPassword(req.body.password, user.password)
            if (!isValidPassword) {
              throw new Error('Password is incorrect')
            }
            req.user = user
            return true
          }
        }
      },
      password: passwordSchema
    },
    ['body']
  )
)

export const registerValidator = validate(
  checkSchema(
    {
      email: {
        ...emailSchema,
        custom: {
          options: async (value) => {
            const user = await commonService.checkEmailExist(value)
            if (user) {
              throw new Error('Email is existed')
            }
            return true
          }
        }
      },
      password: {
        ...passwordSchema,
        ...isStrongPasswordSchema
      },
      confirm_password: confirmPasswordSchema,
      role: userRoleSchema
    },
    ['body']
  )
)

export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        custom: {
          options: async (value: string, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: 'Access token is required',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            value = value.split(' ')[1]
            try {
              const decoded_access_token = await accessTokenDecode(value, req as Request)

              const user = await commonService.getUserById(decoded_access_token.user_id)
              if (!user) {
                throw new ErrorWithStatus({
                  message: 'User not found',
                  status: HTTP_STATUS.UNAUTHORIZED
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
    },
    ['headers']
  )
)

export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        custom: {
          options: async (value: string, { req }) => {
            // Tạm thời cho phép không dùng refresh token
            // if (!value) {
            //   throw new ErrorWithStatus({
            //     message: ERROR_CODE.VALIDATION_ERROR + ': Refresh token is required',
            //     status: HTTP_STATUS.UNAUTHORIZED
            //   })
            // }

            try {
              const [decoded_refresh_token] = await Promise.all([
                verifyToken({
                  token: value,
                  secretOrPublicKey: process.env.JWT_SECRET_KEY_REFRESH_TOKEN as string
                }),
                commonService.getUserToken({
                  user_id: (req.decoded_authorization as AccessTokenPayload).user_id,
                  token_type: TokenType.RefreshToken
                })
              ])

              ;(req as Request).decoded_refresh_token = decoded_refresh_token as RefreshTokenPayload
            } catch (error) {
              if (error instanceof TokenExpiredError) {
                throw new ErrorWithStatus({
                  message: 'Refresh token expired',
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: 'Refresh token invalid',
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }

              throw error
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)

export const forgotPasswordValidator = validate(
  checkSchema(
    {
      email: {
        ...emailSchema,
        custom: {
          options: async (email: string, { req }) => {
            const user = await commonService.checkEmailExist(email)

            if (!user) {
              throw new ErrorWithStatus({
                message: 'Email does not exist',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            if (user.role !== UserRole.Family && user.role !== UserRole.Resident) {
              throw new ErrorWithStatus({
                message: 'Email is not eligible for password reset',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            ;(req as Request).user = user
            return true
          }
        }
      }
    },
    ['body']
  )
)

const forgotPasswordTokenSchema: ParamSchema = {
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
          secretOrPublicKey: process.env.JWT_SECRET_KEY_FORGOT_PASSWORD_TOKEN as string
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

export const verifyForgotPasswordValidator = validate(
  checkSchema(
    {
      forgot_password_token: forgotPasswordTokenSchema
    },
    ['body']
  )
)

export const resetPasswordValidator = validate(
  checkSchema(
    {
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      forgot_password_token: forgotPasswordTokenSchema
    },
    ['body']
  )
)

export const emailVerifyTokenValidator = validate(
  checkSchema(
    {
      email_verify_token: {
        custom: {
          options: async (value: string, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: 'Email verify token is required',
                status: HTTP_STATUS.NOT_FOUND
              })
            }

            try {
              const [decoded_email_verify_token, userToken] = await Promise.all([
                verifyToken({
                  token: value,
                  secretOrPublicKey: process.env.JWT_SECRET_KEY_EMAIL_VERIFY_TOKEN as string
                }),
                commonService.getUserTokenByTokenString({
                  token_string: value
                })
              ])

              if (decoded_email_verify_token.token_type !== TokenType.EmailVerifyToken) {
                throw new ErrorWithStatus({
                  message: 'Email verify token is invalid',
                  status: HTTP_STATUS.NOT_FOUND
                })
              }

              if (!userToken) {
                throw new ErrorWithStatus({
                  message: 'Email verify token is not found',
                  status: HTTP_STATUS.NOT_FOUND
                })
              }

              ;(req as Request).decoded_email_verify_token = decoded_email_verify_token as EmailVerifyTokenReqBody
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
    },
    ['body']
  )
)
