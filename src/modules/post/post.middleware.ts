import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { prisma } from '~/utils/db'

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
      if (post.institution_id !== req.decoded_authorization?.institution_id) {
        throw new ErrorWithStatus({
          message: 'Post does not belong to this institution',
          status: HTTP_STATUS.FORBIDDEN
        })
      }
      return true
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

