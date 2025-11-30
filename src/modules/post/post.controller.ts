import { Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { PostService, postService as postServiceInstance } from './post.service'
import { CreatePostBody, UpdatePostBody, PostListQueryParams, AddCommentBody, ReportPostBody } from './post.dto'

class PostController {
  constructor(private readonly postService: PostService = postServiceInstance) {}

  createPost = async (req: Request, res: Response) => {
    const author_id = req.decoded_authorization?.user_id as string
    const institution_id = req.decoded_authorization?.institution_id as string
    const body = req.body as CreatePostBody

    const data = await this.postService.createPost(author_id, institution_id, body)
    res.status(HTTP_STATUS.OK).json({ message: 'Post created successfully', data })
  }

  getPostById = async (req: Request, res: Response) => {
    const { post_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string | null
    const user_id = req.decoded_authorization?.user_id as string
    const user_role = req.decoded_authorization?.role as string

    const data = await this.postService.getPostById(post_id, institution_id, user_id, user_role)
    res.status(HTTP_STATUS.OK).json({ message: 'Post fetched successfully', data })
  }

  getPosts = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string | null
    const user_id = req.decoded_authorization?.user_id as string
    const user_role = req.decoded_authorization?.role as string
    const query = req.query as unknown as PostListQueryParams

    // Parse query parameters
    const params: PostListQueryParams = {
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      filter: query.filter,
      search: query.search,
      residentIds: query.residentIds
        ? Array.isArray(query.residentIds)
          ? query.residentIds
          : [query.residentIds]
        : undefined
    }

    const data = await this.postService.getPosts(institution_id, params, user_id, user_role)
    res.status(HTTP_STATUS.OK).json({ message: 'Posts fetched successfully', data })
  }

  updatePost = async (req: Request, res: Response) => {
    const { post_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const body = req.body as UpdatePostBody

    const data = await this.postService.updatePost(post_id, institution_id, body)
    res.status(HTTP_STATUS.OK).json({ message: 'Post updated successfully', data })
  }

  deletePost = async (req: Request, res: Response) => {
    const { post_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string

    await this.postService.deletePost(post_id, institution_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Post deleted successfully' })
  }

  toggleLikePost = async (req: Request, res: Response) => {
    const { post_id } = req.params
    const user_id = req.decoded_authorization?.user_id as string
    const institution_id = req.decoded_authorization?.institution_id as string | null

    const data = await this.postService.toggleLikePost(post_id, user_id, institution_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Post like toggled successfully', data })
  }

  addComment = async (req: Request, res: Response) => {
    const { post_id } = req.params
    const user_id = req.decoded_authorization?.user_id as string
    const institution_id = req.decoded_authorization?.institution_id as string | null
    const { content } = req.body as AddCommentBody

    const data = await this.postService.addComment(post_id, user_id, content, institution_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Comment added successfully', data })
  }

  deleteComment = async (req: Request, res: Response) => {
    const { post_id, comment_id } = req.params
    const user_id = req.decoded_authorization?.user_id as string
    const institution_id = req.decoded_authorization?.institution_id as string | null
    const user_role = req.decoded_authorization?.role as string

    await this.postService.deleteComment(post_id, comment_id, user_id, institution_id, user_role)
    res.status(HTTP_STATUS.OK).json({ message: 'Comment deleted successfully' })
  }

  reportPost = async (req: Request, res: Response) => {
    const { post_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const { reason } = req.body as ReportPostBody

    const data = await this.postService.reportPost(post_id, institution_id, reason)
    res.status(HTTP_STATUS.OK).json({ message: 'Post reported successfully', data })
  }
}

const postController = new PostController()

export { postController, PostController }
