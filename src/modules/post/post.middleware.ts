import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { prisma } from '~/utils/db'
import { FamilyLinkStatus, UserRole } from '@prisma/client'

export const postIdSchema = {
  notEmpty: {
    errorMessage: 'Post id is required'
  },
  isUUID: {
    errorMessage: 'Post id must be a valid UUID'
  },
  custom: {
    options: async (value: string, { req }: any) => {
      const post = await prisma.post.findUnique({
        where: { post_id: value },
        select: { institution_id: true }
      })
      if (!post) {
        throw new ErrorWithStatus({ message: 'Post not found', status: HTTP_STATUS.NOT_FOUND })
      }

      const user_role = req.decoded_authorization?.role as string
      const institution_id = req.decoded_authorization?.institution_id as string | undefined
      const user_id = req.decoded_authorization?.user_id as string

      // Staff/Admin: check institution_id from token
      if (user_role === UserRole.Staff || user_role === UserRole.Admin || user_role === UserRole.RootAdmin) {
        if (post.institution_id !== institution_id) {
          throw new ErrorWithStatus({
            message: 'Post does not belong to this institution',
            status: HTTP_STATUS.FORBIDDEN
          })
        }
        return true
      }

      // Family user: check institution_id from family links
      if (user_role === UserRole.Family) {
        if (!user_id) {
          throw new ErrorWithStatus({
            message: 'User ID not found in token',
            status: HTTP_STATUS.UNAUTHORIZED
          })
        }

        // Lấy tất cả institution_ids mà family user có quyền truy cập
        const familyLinks = await prisma.familyResidentLink.findMany({
          where: {
            family_user_id: user_id,
            status: FamilyLinkStatus.active
          },
          select: {
            institution_id: true
          },
          distinct: ['institution_id']
        })

        const allowedInstitutionIds = familyLinks.map((link) => link.institution_id)

        if (allowedInstitutionIds.length === 0) {
          throw new ErrorWithStatus({
            message: 'No active resident link found. Please link to a resident first.',
            status: HTTP_STATUS.FORBIDDEN
          })
        }

        // Check xem post có thuộc một trong các institutions mà family user có quyền không
        if (!allowedInstitutionIds.includes(post.institution_id)) {
          throw new ErrorWithStatus({
            message: 'Post does not belong to this institution',
            status: HTTP_STATUS.FORBIDDEN
          })
        }

        return true
      }

      // Các role khác không được phép
      throw new ErrorWithStatus({
        message: 'You are not authorized to access this resource',
        status: HTTP_STATUS.FORBIDDEN
      })
    }
  },
  trim: true
}

export const commentIdSchema = {
  notEmpty: {
    errorMessage: 'Comment id is required'
  },
  isUUID: {
    errorMessage: 'Comment id must be a valid UUID'
  },
  trim: true
}

export const postIdValidator = validate(
  checkSchema(
    {
      post_id: postIdSchema
    },
    ['params']
  )
)

export const commentIdValidator = validate(
  checkSchema(
    {
      comment_id: commentIdSchema
    },
    ['params']
  )
)
