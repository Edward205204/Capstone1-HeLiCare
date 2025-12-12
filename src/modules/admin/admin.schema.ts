import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import { emailSchema, passwordSchema } from '../auth/auth.schema'
import { commonService } from '~/common/common.service'
import { UserRole, User } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { verifyPassword } from '~/utils/hash'

export const adminLoginValidator = validate(
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
            // Only allow Admin and RootAdmin
            if (user.role !== UserRole.Admin && user.role !== UserRole.RootAdmin) {
              throw new ErrorWithStatus({
                message: 'Only Admin and RootAdmin can access this login',
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
