import { PostVisibility } from '@prisma/client'

export type { PostVisibility }

export interface CreatePostBody {
  title: string
  content: string
  tags?: string[]
  imageUrls?: string[]
  residentIds?: string[] // Optional - không bắt buộc nữa
  visibility?: PostVisibility
}

export interface UpdatePostBody {
  title?: string
  content?: string
  tags?: string[]
  imageUrls?: string[]
  residentIds?: string[]
  visibility?: PostVisibility
}

export interface PostListQueryParams {
  page?: number
  limit?: number
  filter?: 'Day' | 'Week' | 'Month' | 'All'
  search?: string
  residentIds?: string | string[]
}

export interface AddCommentBody {
  content: string
}

export interface ReportPostBody {
  reason?: string
}
