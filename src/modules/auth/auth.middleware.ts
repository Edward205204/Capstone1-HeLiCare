import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import { verifyPassword } from '~/utils/hash'
import { commonService } from '~/common/common.service'
import { InstitutionContractStatus, UserRole } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { accessTokenDecode } from '~/utils/access_token_decode'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import capitalize from 'lodash/capitalize'
import { Request } from 'express'
import {
  AccessTokenPayload,
  EmailVerifyTokenReqBody,
  RefreshTokenPayload,
  AdminInviteTokenReqBody,
  StaffInviteTokenReqBody
} from './auth.dto'
import { verifyToken } from '~/utils/jwt'
import { TokenType } from '~/constants/token_type'
import {
  confirmPasswordSchema,
  emailSchema,
  forgotPasswordTokenSchema,
  fullNameSchema,
  hireDateSchema,
  institutionIdSchema,
  isStrongPasswordSchema,
  notesSchema,
  passwordSchema,
  phoneSchema,
  positionSchema,
  userRoleSchema,
  sendFamilyLinkSchema,
  familyLinkTokenSchema
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
                status: HTTP_STATUS.UNAUTHORIZED
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
            const user = await commonService.checkEmailExist(req.body.email)
            if (!user) {
              throw new ErrorWithStatus({
                message: 'Email does not exist',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            const isValidPassword = await verifyPassword(value, user.password)
            if (!isValidPassword) {
              throw new Error('Password is incorrect')
            }
            return true
          }
        }
      }
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
                status: HTTP_STATUS.CONFLICT
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

export const createStaffForInstitutionValidator = validate(
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
                status: HTTP_STATUS.CONFLICT
              })
            }
            return true
          }
        }
      },
      full_name: fullNameSchema,
      phone: phoneSchema,
      hire_date: hireDateSchema,
      position: positionSchema,
      notes: notesSchema,
      institution_id: {
        ...institutionIdSchema,
        custom: {
          options: async (value, { req }) => {
            if (
              req.decoded_authorization?.role !== UserRole.Admin &&
              req.decoded_authorization?.role !== UserRole.RootAdmin
            ) {
              throw new ErrorWithStatus({
                message: 'You are not authorized to create staff for institution',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            const institution = await commonService.getInstitutionById(value)
            if (!institution) {
              throw new ErrorWithStatus({
                message: 'Institution not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            if (institution.status !== InstitutionContractStatus.active) {
              throw new ErrorWithStatus({
                message: 'Institution is not found',
                status: HTTP_STATUS.NOT_FOUND
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

export const verifyStaffInviteTokenValidator = validate(
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
      },
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      staff_invite_token: {
        custom: {
          options: async (value: string, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: 'Staff invite token is required',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            try {
              const [decoded_staff_invite_token, userToken] = await Promise.all([
                verifyToken({
                  token: value,
                  secretOrPublicKey: env.JWT_SECRET_KEY_COMMON_TOKEN as string
                }),
                commonService.getUserTokenByTokenString({
                  token_string: value
                })
              ])
              if (decoded_staff_invite_token.token_type !== TokenType.StaffInviteToken) {
                throw new ErrorWithStatus({
                  message: 'Staff invite token is invalid',
                  status: HTTP_STATUS.NOT_FOUND
                })
              }

              if (!userToken) {
                throw new ErrorWithStatus({
                  message: 'Staff invite token is not found',
                  status: HTTP_STATUS.NOT_FOUND
                })
              }
              req.decoded_staff_invite_token = decoded_staff_invite_token as StaffInviteTokenReqBody
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

export const createRootAdminValidator = validate(
  checkSchema(
    {
      email: {
        ...emailSchema,
        custom: {
          options: async (value, { req }) => {
            if (req.decoded_authorization?.role !== UserRole.PlatformSuperAdmin) {
              throw new ErrorWithStatus({
                message: 'You are not authorized to create root admin',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            const user = await commonService.checkEmailExist(value)
            if (user) {
              throw new ErrorWithStatus({
                message: 'Email already exists',
                status: HTTP_STATUS.CONFLICT
              })
            }
            return true
          }
        }
      },
      institution_id: {
        ...institutionIdSchema,
        custom: {
          options: async (value) => {
            const institution = await commonService.getInstitutionById(value)
            if (!institution) {
              throw new ErrorWithStatus({
                message: 'Institution not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            if (institution.status !== InstitutionContractStatus.active) {
              throw new ErrorWithStatus({
                message: 'Institution is not found',
                status: HTTP_STATUS.NOT_FOUND
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

export const createAdminValidator = validate(
  checkSchema(
    {
      email: {
        ...emailSchema,
        custom: {
          options: async (value, { req }) => {
            if (req.decoded_authorization?.role !== UserRole.RootAdmin) {
              throw new ErrorWithStatus({
                message: 'You are not authorized to create admin',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            const user = await commonService.checkEmailExist(value)
            if (user) {
              throw new ErrorWithStatus({
                message: 'Email already exists',
                status: HTTP_STATUS.CONFLICT
              })
            }
            if (req.decoded_authorization?.institution_id === null) {
              throw new ErrorWithStatus({
                message: 'You are not authorized to create admin',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            const institution = await commonService.getInstitutionById(req.decoded_authorization.institution_id)
            if (!institution) {
              throw new ErrorWithStatus({
                message: 'Institution not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            if (institution.status !== InstitutionContractStatus.active) {
              throw new ErrorWithStatus({
                message: 'Institution is not found',
                status: HTTP_STATUS.NOT_FOUND
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

export const verifyRootAdminInviteTokenValidator = validate(
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
      },
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      root_admin_invite_token: {
        custom: {
          options: async (value: string, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: 'Root admin invite token is required',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            try {
              const [decoded_root_admin_invite_token, userToken] = await Promise.all([
                verifyToken({
                  token: value,
                  secretOrPublicKey: env.JWT_SECRET_KEY_COMMON_TOKEN as string
                }),
                commonService.getUserTokenByTokenString({
                  token_string: value
                })
              ])
              if (decoded_root_admin_invite_token.token_type !== TokenType.AdminInviteToken) {
                throw new ErrorWithStatus({
                  message: 'Root admin invite token is invalid',
                  status: HTTP_STATUS.NOT_FOUND
                })
              }

              if (!userToken) {
                throw new ErrorWithStatus({
                  message: 'Root admin invite token is not found',
                  status: HTTP_STATUS.NOT_FOUND
                })
              }
              req.decoded_root_admin_invite_token = decoded_root_admin_invite_token as AdminInviteTokenReqBody
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

export const verifyAdminInviteTokenValidator = validate(
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
      },
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      admin_invite_token: {
        custom: {
          options: async (value: string, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: 'Admin invite token is required',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            try {
              const [decoded_admin_invite_token, userToken] = await Promise.all([
                verifyToken({
                  token: value,
                  secretOrPublicKey: env.JWT_SECRET_KEY_COMMON_TOKEN as string
                }),
                commonService.getUserTokenByTokenString({
                  token_string: value
                })
              ])
              if (decoded_admin_invite_token.token_type !== TokenType.AdminInviteToken) {
                throw new ErrorWithStatus({
                  message: 'Admin invite token is invalid',
                  status: HTTP_STATUS.NOT_FOUND
                })
              }

              if (!userToken) {
                throw new ErrorWithStatus({
                  message: 'Admin invite token is not found',
                  status: HTTP_STATUS.NOT_FOUND
                })
              }

              req.decoded_admin_invite_token = decoded_admin_invite_token as AdminInviteTokenReqBody
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
