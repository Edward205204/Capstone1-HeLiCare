import { Prisma, PostVisibility, FamilyLinkStatus } from '@prisma/client'
import { prisma } from '~/utils/db'
import { CreatePostBody, UpdatePostBody, PostListQueryParams } from './post.dto'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import omitBy from 'lodash/omitBy'
import isNil from 'lodash/isNil'

class PostService {
  async createPost(author_id: string, institution_id: string, data: CreatePostBody) {
    const { title, content, tags, imageUrls, residentIds, visibility } = data

    // Verify residents if provided
    if (residentIds && residentIds.length > 0) {
      const residents = await prisma.resident.findMany({
        where: {
          resident_id: { in: residentIds },
          institution_id
        }
      })

      if (residents.length !== residentIds.length) {
        throw new ErrorWithStatus({
          message: 'Some residents not found or do not belong to this institution',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    // Create post with residents (if provided)
    const post = await prisma.post.create({
      data: {
        institution_id,
        author_id,
        title,
        content,
        image_urls: imageUrls || [],
        tags: tags || [],
        visibility: visibility || PostVisibility.PUBLIC,
        postResidents:
          residentIds && residentIds.length > 0
            ? {
                create: residentIds.map((resident_id) => ({
                  resident_id
                }))
              }
            : undefined
      },
      include: {
        author: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        postResidents: {
          include: {
            resident: {
              select: {
                resident_id: true,
                full_name: true,
                room: {
                  select: {
                    room_number: true
                  }
                }
              }
            }
          }
        },
        comments: {
          take: 0 // Don't load comments on create
        },
        postLikes: {
          take: 0 // Don't load likes on create
        }
      }
    })

    return this.formatPostResponse(post)
  }

  async getPostById(post_id: string, institution_id: string | null, user_id?: string, user_role?: string) {
    // Nếu institution_id null (family user chưa có institution_id), lấy từ FamilyResidentLink
    let finalInstitutionIds: string[] = []
    if (institution_id) {
      finalInstitutionIds = [institution_id]
    } else if (user_id && user_role === 'Family') {
      // Lấy TẤT CẢ institutions mà family user link với
      const familyLinks = await prisma.familyResidentLink.findMany({
        where: {
          family_user_id: user_id,
          status: FamilyLinkStatus.active
        },
        select: {
          institution_id: true
        },
        distinct: ['institution_id'] // Chỉ lấy unique institution_ids
      })
      finalInstitutionIds = familyLinks.map(link => link.institution_id)
    }

    // Nếu vẫn không có institution_id, throw error
    if (finalInstitutionIds.length === 0) {
      throw new ErrorWithStatus({
        message: 'Institution ID not found. Please link to a resident first.',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Build where clause với visibility filter cho Family
    const where: Prisma.PostWhereInput = {
      post_id,
      institution_id: finalInstitutionIds.length === 1 
        ? finalInstitutionIds[0] 
        : { in: finalInstitutionIds }
    }

    // Filter by visibility based on user role
    if (user_role === 'Family') {
      // Family can only see PUBLIC or STAFF_AND_FAMILY_OF_RESIDENTS posts
      where.visibility = {
        in: [PostVisibility.PUBLIC, PostVisibility.STAFF_AND_FAMILY_OF_RESIDENTS]
      }
    } else if (user_role === 'Resident') {
      // Residents can only see PUBLIC posts
      where.visibility = PostVisibility.PUBLIC
    }
    // Staff and Admin can see all posts

    const post = await prisma.post.findFirst({
      where,
      include: {
        author: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        postResidents: {
          include: {
            resident: {
              select: {
                resident_id: true,
                full_name: true,
                room: {
                  select: {
                    room_number: true
                  }
                }
              }
            }
          }
        },
        comments: {
          orderBy: { created_at: 'asc' },
          include: {
            user: {
              select: {
                user_id: true,
                email: true,
                staffProfile: {
                  select: {
                    full_name: true
                  }
                },
                familyProfile: {
                  select: {
                    full_name: true
                  }
                }
              }
            }
          }
        },
        postLikes: {
          take: 0 // Don't load all likes, just count
        }
      }
    })

    if (!post) {
      throw new ErrorWithStatus({
        message: 'Post not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return this.formatPostResponse(post)
  }

  async getPosts(institution_id: string | null, params: PostListQueryParams, user_id?: string, user_role?: string) {
    const { page = 1, limit = 10, filter, search, residentIds } = params
    const skip = (page - 1) * limit

    // Nếu institution_id null (family user chưa có institution_id), lấy từ FamilyResidentLink
    let finalInstitutionIds: string[] = []
    if (institution_id) {
      finalInstitutionIds = [institution_id]
    } else if (user_id && user_role === 'Family') {
      // Lấy TẤT CẢ institutions mà family user link với
      const familyLinks = await prisma.familyResidentLink.findMany({
        where: {
          family_user_id: user_id,
          status: FamilyLinkStatus.active
        },
        select: {
          institution_id: true
        },
        distinct: ['institution_id'] // Chỉ lấy unique institution_ids
      })
      finalInstitutionIds = familyLinks.map(link => link.institution_id)
    }

    // Nếu vẫn không có institution_id, throw error
    if (finalInstitutionIds.length === 0) {
      throw new ErrorWithStatus({
        message: 'Institution ID not found. Please link to a resident first.',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Build where clause - filter posts từ TẤT CẢ institutions mà user có quyền
    const where: Prisma.PostWhereInput = {
      institution_id: finalInstitutionIds.length === 1 
        ? finalInstitutionIds[0] 
        : { in: finalInstitutionIds }
    }

    // Filter by time
    if (filter && filter !== 'All') {
      const now = new Date()
      let startDate: Date

      switch (filter) {
        case 'Day':
          startDate = new Date(now.setHours(0, 0, 0, 0))
          break
        case 'Week':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case 'Month':
          startDate = new Date(now.setMonth(now.getMonth() - 1))
          break
        default:
          startDate = new Date(0)
      }

      where.created_at = {
        gte: startDate
      }
    }

    // Search by title or content
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Filter by residents
    if (residentIds) {
      const residentIdArray = Array.isArray(residentIds) ? residentIds : [residentIds]
      where.postResidents = {
        some: {
          resident_id: { in: residentIdArray }
        }
      }
    }

    // Filter by visibility based on user role
    if (user_role === 'Family') {
      // Family can only see PUBLIC or STAFF_AND_FAMILY_OF_RESIDENTS posts
      // and only for their linked residents
      where.visibility = {
        in: [PostVisibility.PUBLIC, PostVisibility.STAFF_AND_FAMILY_OF_RESIDENTS]
      }
    } else if (user_role === 'Resident') {
      // Residents can only see PUBLIC posts
      where.visibility = PostVisibility.PUBLIC
    }
    // Staff and Admin can see all posts

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          author: {
            select: {
              user_id: true,
              email: true,
              staffProfile: {
                select: {
                  full_name: true
                }
              }
            }
          },
          postResidents: {
            include: {
              resident: {
                select: {
                  resident_id: true,
                  full_name: true,
                  room: {
                    select: {
                      room_number: true
                    }
                  }
                }
              }
            }
          },
          comments: {
            orderBy: { created_at: 'asc' },
            include: {
              user: {
                select: {
                  user_id: true,
                  email: true,
                  staffProfile: {
                    select: {
                      full_name: true
                    }
                  },
                  familyProfile: {
                    select: {
                      full_name: true
                    }
                  }
                }
              }
            }
          },
          postLikes: user_id
            ? {
                where: {
                  user_id
                },
                take: 1
              }
            : false
        }
      }),
      prisma.post.count({ where })
    ])

    const hasMore = skip + limit < total

    return {
      data: posts.map((post) => this.formatPostResponse(post)),
      total,
      page,
      limit,
      hasMore
    }
  }

  async updatePost(post_id: string, institution_id: string, data: UpdatePostBody) {
    // Verify post exists and belongs to institution
    const existingPost = await prisma.post.findFirst({
      where: {
        post_id,
        institution_id
      }
    })

    if (!existingPost) {
      throw new ErrorWithStatus({
        message: 'Post not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // If residentIds are provided, validate them
    if (data.residentIds) {
      const residents = await prisma.resident.findMany({
        where: {
          resident_id: { in: data.residentIds },
          institution_id
        }
      })

      if (residents.length !== data.residentIds.length) {
        throw new ErrorWithStatus({
          message: 'Some residents not found or do not belong to this institution',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    // Prepare update data
    const updateData: Prisma.PostUpdateInput = omitBy(
      {
        title: data.title,
        content: data.content,
        image_urls: data.imageUrls,
        tags: data.tags,
        visibility: data.visibility
      },
      isNil
    )

    // Update post
    const post = await prisma.post.update({
      where: { post_id },
      data: updateData,
      include: {
        author: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        postResidents: {
          include: {
            resident: {
              select: {
                resident_id: true,
                full_name: true,
                room: {
                  select: {
                    room_number: true
                  }
                }
              }
            }
          }
        },
        comments: {
          orderBy: { created_at: 'asc' },
          include: {
            user: {
              select: {
                user_id: true,
                email: true,
                staffProfile: {
                  select: {
                    full_name: true
                  }
                },
                familyProfile: {
                  select: {
                    full_name: true
                  }
                }
              }
            }
          }
        },
        postLikes: {
          take: 0
        }
      }
    })

    // Update residents if provided
    if (data.residentIds) {
      // Delete existing relations
      await prisma.postResident.deleteMany({
        where: { post_id }
      })

      // Create new relations
      await prisma.postResident.createMany({
        data: data.residentIds.map((resident_id) => ({
          post_id,
          resident_id
        }))
      })

      // Reload post with updated residents
      return this.getPostById(post_id, institution_id)
    }

    return this.formatPostResponse(post)
  }

  async deletePost(post_id: string, institution_id: string) {
    const post = await prisma.post.findFirst({
      where: {
        post_id,
        institution_id
      }
    })

    if (!post) {
      throw new ErrorWithStatus({
        message: 'Post not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    await prisma.post.delete({
      where: { post_id }
    })
  }

  async toggleLikePost(post_id: string, user_id: string, institution_id: string) {
    // Verify post exists
    const post = await prisma.post.findFirst({
      where: {
        post_id,
        institution_id
      }
    })

    if (!post) {
      throw new ErrorWithStatus({
        message: 'Post not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Check if user already liked
    const existingLike = await prisma.postLike.findFirst({
      where: {
        post_id,
        user_id
      }
    })

    if (existingLike) {
      // Unlike - delete by composite key
      await prisma.postLike.deleteMany({
        where: {
          post_id,
          user_id
        }
      })

      // Decrement likes count
      await prisma.post.update({
        where: { post_id },
        data: {
          likes_count: {
            decrement: 1
          }
        }
      })

      const updatedPost = await prisma.post.findUnique({
        where: { post_id },
        select: { likes_count: true }
      })

      return {
        liked: false,
        likes: updatedPost?.likes_count || 0
      }
    } else {
      // Like
      await prisma.postLike.create({
        data: {
          post_id,
          user_id
        }
      })

      // Increment likes count
      await prisma.post.update({
        where: { post_id },
        data: {
          likes_count: {
            increment: 1
          }
        }
      })

      const updatedPost = await prisma.post.findUnique({
        where: { post_id },
        select: { likes_count: true }
      })

      return {
        liked: true,
        likes: updatedPost?.likes_count || 0
      }
    }
  }

  async addComment(post_id: string, user_id: string, content: string, institution_id: string) {
    // Verify post exists
    const post = await prisma.post.findFirst({
      where: {
        post_id,
        institution_id
      }
    })

    if (!post) {
      throw new ErrorWithStatus({
        message: 'Post not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const comment = await prisma.comment.create({
      data: {
        post_id,
        user_id,
        content
      },
      include: {
        user: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            },
            familyProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      }
    })

    return this.formatCommentResponse(comment)
  }

  async deleteComment(post_id: string, comment_id: string, user_id: string, institution_id: string) {
    // Verify comment exists and belongs to post
    const comment = await prisma.comment.findFirst({
      where: {
        comment_id,
        post_id
      },
      include: {
        post: {
          select: {
            institution_id: true
          }
        }
      }
    })

    if (!comment) {
      throw new ErrorWithStatus({
        message: 'Comment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (comment.post.institution_id !== institution_id) {
      throw new ErrorWithStatus({
        message: 'Comment does not belong to this institution',
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    // Only allow author or staff/admin to delete
    const user = await prisma.user.findUnique({
      where: { user_id },
      select: { role: true }
    })

    if (comment.user_id !== user_id && user?.role !== 'Staff' && user?.role !== 'Admin') {
      throw new ErrorWithStatus({
        message: 'You do not have permission to delete this comment',
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    await prisma.comment.delete({
      where: { comment_id }
    })
  }

  async reportPost(post_id: string, institution_id: string, reason?: string) {
    // Verify post exists
    const post = await prisma.post.findFirst({
      where: {
        post_id,
        institution_id
      }
    })

    if (!post) {
      throw new ErrorWithStatus({
        message: 'Post not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // TODO: Implement reporting logic (e.g., create a Report table, send notification, etc.)
    // For now, just log it
    console.log(`Post ${post_id} reported. Reason: ${reason || 'No reason provided'}`)

    return { message: 'Post reported successfully' }
  }

  // Helper method to format post response
  private formatPostResponse(post: any) {
    const authorName =
      post.author?.staffProfile?.full_name || post.author?.familyProfile?.full_name || post.author?.email || 'Unknown'

    return {
      id: post.post_id,
      title: post.title,
      content: post.content,
      imageUrls: post.image_urls || [],
      tags: post.tags || [],
      createdAt: post.created_at.toISOString(),
      updatedAt: post.updated_at?.toISOString(),
      likes: post.likes_count || 0,
      comments: (post.comments || []).map((comment: any) => this.formatCommentResponse(comment)),
      residentIds: (post.postResidents || []).map((pr: any) => pr.resident_id),
      visibility: post.visibility,
      authorId: post.author_id,
      authorName,
      authorAvatar: undefined, // Can be added later if avatar is implemented
      isLiked: post.postLikes && post.postLikes.length > 0
    }
  }

  // Helper method to format comment response
  private formatCommentResponse(comment: any) {
    const authorName =
      comment.user?.staffProfile?.full_name ||
      comment.user?.familyProfile?.full_name ||
      comment.user?.email ||
      'Unknown'

    return {
      id: comment.comment_id,
      content: comment.content,
      authorId: comment.user_id,
      authorName,
      authorAvatar: undefined, // Can be added later if avatar is implemented
      createdAt: comment.created_at.toISOString()
    }
  }
}

const postService = new PostService()

export { postService, PostService }
