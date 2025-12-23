import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import { verifyPassword } from '~/utils/hash'
import { commonService } from '~/common/common.service'
import { User, UserRole } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { accessTokenDecode } from '~/utils/access_token_decode'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import capitalize from 'lodash/capitalize'
import { Request } from 'express'
import { AccessTokenPayload, EmailVerifyTokenReqBody, RefreshTokenPayload } from './auth.dto'
import { verifyToken } from '~/utils/jwt'
import { TokenType } from '~/constants/token_type'
import {
  confirmPasswordSchema,
  emailSchema,
  forgotPasswordTokenSchema,
  isStrongPasswordSchema,
  passwordSchema,
  userRoleSchema,
  sendFamilyLinkSchema,
  familyLinkTokenSchema,
  fullNameSchema
} from './auth.schema'
import { env } from '~/utils/dot.env'

export const loginValidator = validate(
  checkSchema(
    {
      email: {
        ...emailSchema,
        custom: {
          options: async (value, { req }) => {
            const user = await commonService.checkEmailExist(value)
            if (!user) {
              throw new ErrorWithStatus({
                message: 'Email does not exist',
                status: HTTP_STATUS.UNPROCESSABLE_ENTITY
              })
            }
            req.user = user
            return true
          }
        }
      },
      password: {
        ...passwordSchema,
        custom: {
          options: async (value, { req }) => {
            const user = (await commonService.checkEmailExist(req.body.email)) as User
            const isValidPassword = await verifyPassword(value, user.password)
            if (!isValidPassword) {
              throw new ErrorWithStatus({
                message: 'Password is incorrect',
                status: HTTP_STATUS.UNPROCESSABLE_ENTITY
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

export const residentLoginValidator = validate(
  checkSchema(
    {
      username: {
        notEmpty: {
          errorMessage: 'Username is required'
        },
        isString: {
          errorMessage: 'Username must be a string'
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            const user = await commonService.checkUsernameExist(value)
            if (!user) {
              throw new ErrorWithStatus({
                message: 'Username does not exist',
                status: HTTP_STATUS.UNPROCESSABLE_ENTITY
              })
            }
            // Check if user is a resident
            if (user.role !== UserRole.Resident) {
              throw new ErrorWithStatus({
                message: 'This username is not for a resident account',
                status: HTTP_STATUS.FORBIDDEN
              })
            }
            req.user = user
            return true
          }
        }
      },
      password: {
        ...passwordSchema,
        custom: {
          options: async (value, { req }) => {
            const user = (await commonService.checkUsernameExist(req.body.username)) as User
            if (!user) {
              throw new ErrorWithStatus({
                message: 'Username does not exist',
                status: HTTP_STATUS.UNPROCESSABLE_ENTITY
              })
            }
            const isValidPassword = await verifyPassword(value, user.password)
            if (!isValidPassword) {
              throw new ErrorWithStatus({
                message: 'Password is incorrect',
                status: HTTP_STATUS.UNPROCESSABLE_ENTITY
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

export const resendEmailVerifyValidator = validate(
  checkSchema(
    {
      email: emailSchema
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
              throw new ErrorWithStatus({
                message: 'Email already exists',
                status: HTTP_STATUS.UNPROCESSABLE_ENTITY
              })
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
      role: userRoleSchema,
      full_name: fullNameSchema
    },
    ['body']
  )
)

export const createFamilyAccountValidator = validate(
  checkSchema(
    {
      email: {
        ...emailSchema,
        custom: {
          options: async (value) => {
            const user = await commonService.checkEmailExist(value)
            if (user) {
              throw new ErrorWithStatus({
                message: 'Email already exists',
                status: HTTP_STATUS.UNPROCESSABLE_ENTITY
              })
            }
            return true
          }
        }
      },
      full_name: fullNameSchema
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
            if (!value) {
              throw new ErrorWithStatus({
                message: 'Refresh token is required',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            try {
              const [decoded_refresh_token] = await Promise.all([
                verifyToken({
                  token: value,
                  secretOrPublicKey: env.JWT_SECRET_KEY_REFRESH_TOKEN as string
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

export const changePasswordValidator = validate(
  checkSchema(
    {
      current_password: passwordSchema,
      new_password: {
        ...passwordSchema,
        ...isStrongPasswordSchema
      },
      confirm_password: confirmPasswordSchema
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
                  secretOrPublicKey: env.JWT_SECRET_KEY_COMMON_TOKEN as string
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

export const renewInviteTokenValidator = validate(
  checkSchema(
    {
      email: {
        ...emailSchema,
        custom: {
          options: async (value, { req }) => {
            const user = await commonService.checkEmailExist(value)
            if (!user) {
              throw new ErrorWithStatus({
                message: 'Email does not exist',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            if (user.role !== UserRole.Staff && user.role !== UserRole.RootAdmin && user.role !== UserRole.Admin) {
              throw new ErrorWithStatus({
                message:
                  'Email is not eligible for renew invite token, only staff, root admin and admin can renew invite token',
                status: HTTP_STATUS.FORBIDDEN
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

export const sendFamilyLinkValidator = validate(
  checkSchema(
    {
      ...sendFamilyLinkSchema
    },
    ['body']
  )
)

export const validateFamilyLinkTokenValidator = validate(
  checkSchema(
    {
      family_link_token: familyLinkTokenSchema
    },
    ['query']
  )
)

export const confirmFamilyLinkValidator = validate(
  checkSchema(
    {
      family_link_token: familyLinkTokenSchema
    },
    ['body']
  )
)

export const checkUserByEmailValidator = validate(
  checkSchema(
    {
      email: {
        ...emailSchema,
        custom: {
          options: async (value) => {
            const user = await commonService.checkEmailExist(value)
            if (!user) {
              throw new ErrorWithStatus({
                message: 'Email does not exist',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            return true
          }
        }
      }
    },
    ['query']
  )
)
