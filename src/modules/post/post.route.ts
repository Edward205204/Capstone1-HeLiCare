import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { postController } from './post.controller'
import { postIdValidator, commentIdValidator } from './post.middleware'
import { validate } from '~/utils/validate'
import { checkSchema } from 'express-validator'
import { createPostSchema, updatePostSchema, addCommentSchema } from './post.schema'
import { isHandleByStaffValidator } from '~/common/common.middleware'

const postRouter = Router()

// Create post (Staff only)
postRouter.post(
  '/',
  accessTokenValidator,
  isHandleByStaffValidator,
  validate(checkSchema(createPostSchema)),
  wrapRequestHandler(postController.createPost)
)

// Get posts list with pagination and filters
postRouter.get('/', accessTokenValidator, wrapRequestHandler(postController.getPosts))

// Get post by ID
postRouter.get('/:post_id', accessTokenValidator, postIdValidator, wrapRequestHandler(postController.getPostById))

// Update post (Staff only)
postRouter.put(
  '/:post_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  postIdValidator,
  validate(checkSchema(updatePostSchema)),
  wrapRequestHandler(postController.updatePost)
)

// Delete post (Staff only)
postRouter.delete(
  '/:post_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  postIdValidator,
  wrapRequestHandler(postController.deletePost)
)

// Like/Unlike post
postRouter.post(
  '/:post_id/like',
  accessTokenValidator,
  postIdValidator,
  wrapRequestHandler(postController.toggleLikePost)
)

// Add comment
postRouter.post(
  '/:post_id/comments',
  accessTokenValidator,
  postIdValidator,
  validate(checkSchema(addCommentSchema)),
  wrapRequestHandler(postController.addComment)
)

// Delete comment
postRouter.delete(
  '/:post_id/comments/:comment_id',
  accessTokenValidator,
  postIdValidator,
  commentIdValidator,
  wrapRequestHandler(postController.deleteComment)
)

// Report post
postRouter.post(
  '/:post_id/report',
  accessTokenValidator,
  postIdValidator,
  wrapRequestHandler(postController.reportPost)
)

export default postRouter
