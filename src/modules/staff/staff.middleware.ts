import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import {
  confirmPasswordSchema,
  emailSchema,
  fullNameSchema,
  institutionIdSchema,
  passwordSchema
} from '../auth/auth.schema'
import { commonService } from '~/common/common.service'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { avatarSchema, hireDateSchema, notesSchema, phoneSchema, positionSchema } from './staff.schema'
import { TokenType, UserRole } from '@prisma/client'
import { InstitutionContractStatus } from '@prisma/client'
import { capitalize } from 'lodash'
import { JsonWebTokenError } from 'jsonwebtoken'
import { AdminInviteTokenReqBody, StaffInviteTokenReqBody } from '../auth/auth.dto'
import { env } from '~/utils/dot.env'
import { verifyToken } from '~/utils/jwt'

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
      avatar: avatarSchema,
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
      avatar: avatarSchema,
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
