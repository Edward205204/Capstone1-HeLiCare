import { FeedbackStatus, Prisma } from '@prisma/client'
import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  CreateFeedbackReqBody,
  UpdateFeedbackReqBody,
  GetFeedbacksQuery,
  GetFeedbacksByFamilyQuery,
  FeedbackResponse,
  CategoryResponse
} from './feedback.dto'
import { notificationService } from './notification.service'

class FeedbackService {
  // ========== CATEGORY METHODS ==========

  // Get all categories for an institution
  getCategories = async (institution_id: string): Promise<CategoryResponse[]> => {
    const categories = await prisma.feedbackCategory.findMany({
      where: {
        institution_id,
        is_active: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return categories.map((cat) => ({
      category_id: cat.category_id,
      institution_id: cat.institution_id,
      name: cat.name,
      description: cat.description,
      metadata: cat.metadata as CategoryResponse['metadata'],
      is_active: cat.is_active,
      created_at: cat.created_at.toISOString(),
      updated_at: cat.updated_at.toISOString()
    }))
  }

  // ========== FEEDBACK METHODS ==========

  // Create feedback (Family)
  createFeedback = async (
    family_user_id: string,
    institution_id: string,
    feedbackData: CreateFeedbackReqBody
  ): Promise<FeedbackResponse> => {
    const { resident_id, category_id, type, message, attachments = [] } = feedbackData

    // Validate category exists and belongs to institution
    const category = await prisma.feedbackCategory.findFirst({
      where: {
        category_id,
        institution_id,
        is_active: true
      }
    })

    if (!category) {
      throw new ErrorWithStatus({
        message: 'Category not found or inactive',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Validate resident if provided
    if (resident_id) {
      const resident = await prisma.resident.findFirst({
        where: {
          resident_id,
          institution_id
        }
      })

      if (!resident) {
        throw new ErrorWithStatus({
          message: 'Resident not found or does not belong to this institution',
          status: HTTP_STATUS.NOT_FOUND
        })
      }

      // Check if family user has access to this resident
      const link = await prisma.familyResidentLink.findFirst({
        where: {
          family_user_id,
          resident_id,
          status: 'active'
        }
      })

      if (!link) {
        throw new ErrorWithStatus({
          message: 'You do not have access to this resident',
          status: HTTP_STATUS.FORBIDDEN
        })
      }
    }

    // Check for duplicate feedback (same message within last 24 hours)
    const duplicateCheck = await prisma.feedback.findFirst({
      where: {
        family_user_id,
        institution_id,
        message: {
          equals: message,
          mode: 'insensitive'
        },
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })

    if (duplicateCheck) {
      throw new ErrorWithStatus({
        message: 'Similar feedback was submitted recently. Please check your feedback history.',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const feedback = await prisma.feedback.create({
      data: {
        family_user_id,
        institution_id,
        resident_id: resident_id || null,
        category_id,
        type: type || null,
        message,
        attachments: attachments || [],
        status: FeedbackStatus.pending
      },
      include: {
        resident: {
          include: {
            room: {
              select: {
                room_id: true,
                room_number: true
              }
            },
            dietTags: {
              where: {
                is_active: true
              },
              select: {
                tag_id: true,
                tag_type: true,
                tag_name: true
              }
            }
          }
        },
        category: true,
        family_user: {
          select: {
            email: true,
            familyProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        institution: {
          select: {
            name: true
          }
        }
      }
    })

    return this.formatFeedbackResponse(feedback)
  }

  // Get feedbacks (Staff view - with filters)
  getFeedbacks = async (
    institution_id: string,
    query: GetFeedbacksQuery = {}
  ): Promise<{
    data: FeedbackResponse[]
    total: number
    page: number
    limit: number
  }> => {
    const { category_id, type, status, resident_id, start_date, end_date, page = 1, limit = 20 } = query

    const skip = (page - 1) * limit

    const where: Prisma.FeedbackWhereInput = {
      institution_id
    }

    if (category_id) {
      where.category_id = category_id
    }

    if (type) {
      where.type = type
    }

    if (status) {
      where.status = status
    }

    if (resident_id) {
      where.resident_id = resident_id
    }

    if (start_date || end_date) {
      where.created_at = {}
      if (start_date) {
        where.created_at.gte = new Date(start_date)
      }
      if (end_date) {
        where.created_at.lte = new Date(end_date)
      }
    }

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          resident: {
            include: {
              room: {
                select: {
                  room_id: true,
                  room_number: true
                }
              },
              dietTags: {
                where: {
                  is_active: true
                },
                select: {
                  tag_id: true,
                  tag_type: true,
                  tag_name: true
                }
              }
            }
          },
          category: true,
          family_user: {
            select: {
              email: true,
              familyProfile: {
                select: {
                  full_name: true
                }
              }
            }
          },
          assigned_staff: {
            select: {
              user_id: true,
              staffProfile: {
                select: {
                  full_name: true
                }
              }
            }
          },
          institution: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.feedback.count({ where })
    ])

    return {
      data: feedbacks.map((f) => this.formatFeedbackResponse(f)),
      total,
      page,
      limit
    }
  }

  // Get feedback by ID
  getFeedbackById = async (feedback_id: string, institution_id?: string): Promise<FeedbackResponse> => {
    const where: Prisma.FeedbackWhereInput = {
      feedback_id
    }

    if (institution_id) {
      where.institution_id = institution_id
    }

    const feedback = await prisma.feedback.findFirst({
      where,
      include: {
        resident: {
          include: {
            room: {
              select: {
                room_id: true,
                room_number: true
              }
            },
            dietTags: {
              where: {
                is_active: true
              },
              select: {
                tag_id: true,
                tag_type: true,
                tag_name: true
              }
            }
          }
        },
        category: true,
        family_user: {
          select: {
            email: true,
            familyProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        assigned_staff: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        institution: {
          select: {
            name: true
          }
        }
      }
    })

    if (!feedback) {
      throw new ErrorWithStatus({
        message: 'Feedback not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return this.formatFeedbackResponse(feedback)
  }

  // Get feedbacks by family user
  getFeedbacksByFamily = async (
    family_user_id: string,
    query: GetFeedbacksByFamilyQuery = {}
  ): Promise<FeedbackResponse[]> => {
    const { status, category_id, resident_id } = query

    // Get institution_ids from family links
    const links = await prisma.familyResidentLink.findMany({
      where: {
        family_user_id,
        status: 'active'
      },
      select: {
        institution_id: true
      },
      distinct: ['institution_id']
    })

    const institution_ids = links.map((l) => l.institution_id)

    if (institution_ids.length === 0) {
      return []
    }

    const where: Prisma.FeedbackWhereInput = {
      family_user_id,
      institution_id: {
        in: institution_ids
      }
    }

    if (status) {
      where.status = status
    }

    if (category_id) {
      where.category_id = category_id
    }

    if (resident_id) {
      where.resident_id = resident_id
    }

    const feedbacks = await prisma.feedback.findMany({
      where,
      include: {
        resident: {
          include: {
            room: {
              select: {
                room_id: true,
                room_number: true
              }
            },
            dietTags: {
              where: {
                is_active: true
              },
              select: {
                tag_id: true,
                tag_type: true,
                tag_name: true
              }
            }
          }
        },
        category: true,
        family_user: {
          select: {
            email: true,
            familyProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        assigned_staff: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        institution: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return feedbacks.map((f) => this.formatFeedbackResponse(f))
  }

  // Update feedback (Staff)
  updateFeedback = async (
    feedback_id: string,
    institution_id: string,
    updateData: UpdateFeedbackReqBody
  ): Promise<FeedbackResponse> => {
    // Verify feedback exists and belongs to institution
    const existing = await prisma.feedback.findFirst({
      where: {
        feedback_id,
        institution_id
      }
    })

    if (!existing) {
      throw new ErrorWithStatus({
        message: 'Feedback not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const updatePayload: Prisma.FeedbackUpdateInput = {}

    if (updateData.status !== undefined) {
      updatePayload.status = updateData.status

      // Auto-set resolved_at when status is resolved
      if (updateData.status === FeedbackStatus.resolved) {
        updatePayload.resolved_at = new Date()
      }
    }

    if (updateData.staff_notes !== undefined) {
      updatePayload.staff_notes = updateData.staff_notes
    }

    if (updateData.assigned_staff_id !== undefined) {
      // Validate staff belongs to institution
      if (updateData.assigned_staff_id) {
        const staff = await prisma.user.findFirst({
          where: {
            user_id: updateData.assigned_staff_id,
            institution_id,
            role: {
              in: ['Staff', 'Admin', 'RootAdmin']
            }
          }
        })

        if (!staff) {
          throw new ErrorWithStatus({
            message: 'Staff not found or does not belong to this institution',
            status: HTTP_STATUS.NOT_FOUND
          })
        }

        updatePayload.assigned_staff = {
          connect: { user_id: updateData.assigned_staff_id }
        }
      } else {
        // Disconnect if assigned_staff_id is empty string or null
        updatePayload.assigned_staff = {
          disconnect: true
        }
      }
    }

    if (updateData.type !== undefined) {
      updatePayload.type = updateData.type
    }

    const feedback = await prisma.feedback.update({
      where: { feedback_id },
      data: updatePayload,
      include: {
        resident: {
          include: {
            room: {
              select: {
                room_id: true,
                room_number: true
              }
            },
            dietTags: {
              where: {
                is_active: true
              },
              select: {
                tag_id: true,
                tag_type: true,
                tag_name: true
              }
            }
          }
        },
        category: true,
        family_user: {
          select: {
            email: true,
            familyProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        assigned_staff: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        institution: {
          select: {
            name: true
          }
        }
      }
    })

    // Auto-send notification if status changed
    if (updateData.status && updateData.status !== existing.status) {
      notificationService.notifyFeedbackUpdate(feedback_id, institution_id, updateData.status).catch((error) => {
        console.error('Failed to send notification:', error)
        // Don't throw - notification failure shouldn't break the update
      })
    }

    return this.formatFeedbackResponse(feedback)
  }

  // Get feedback statistics (for staff dashboard)
  getFeedbackStats = async (institution_id: string) => {
    const [total, byStatus, byCategory, duplicates] = await Promise.all([
      prisma.feedback.count({
        where: { institution_id }
      }),
      prisma.feedback.groupBy({
        by: ['status'],
        where: { institution_id },
        _count: true
      }),
      prisma.feedback.groupBy({
        by: ['category_id'],
        where: { institution_id },
        _count: true
      }),
      // Find potential duplicates (same message within 7 days)
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "Feedback" f1
        WHERE f1.institution_id = ${institution_id}
        AND EXISTS (
          SELECT 1
          FROM "Feedback" f2
          WHERE f2.institution_id = f1.institution_id
          AND f2.message = f1.message
          AND f2.feedback_id != f1.feedback_id
          AND f2.created_at > f1.created_at - INTERVAL '7 days'
        )
      `
    ])

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count
          return acc
        },
        {} as Record<string, number>
      ),
      byCategory: byCategory.reduce(
        (acc, item) => {
          acc[item.category_id] = item._count
          return acc
        },
        {} as Record<string, number>
      ),
      duplicateCount: Number(duplicates[0]?.count || 0)
    }
  }

  // Helper: Format feedback response
  private formatFeedbackResponse(feedback: any): FeedbackResponse {
    return {
      feedback_id: feedback.feedback_id,
      family_user_id: feedback.family_user_id,
      resident_id: feedback.resident_id,
      institution_id: feedback.institution_id,
      category_id: feedback.category_id,
      type: feedback.type,
      message: feedback.message,
      attachments: feedback.attachments || [],
      status: feedback.status,
      staff_notes: feedback.staff_notes,
      assigned_staff_id: feedback.assigned_staff_id,
      created_at: feedback.created_at.toISOString(),
      updated_at: feedback.updated_at.toISOString(),
      resolved_at: feedback.resolved_at?.toISOString() || null,
      resident: feedback.resident
        ? {
            resident_id: feedback.resident.resident_id,
            full_name: feedback.resident.full_name,
            room: feedback.resident.room
              ? {
                  room_id: feedback.resident.room.room_id,
                  room_number: feedback.resident.room.room_number
                }
              : null,
            dietTags: feedback.resident.dietTags || []
          }
        : null,
      category: feedback.category
        ? {
            category_id: feedback.category.category_id,
            institution_id: feedback.category.institution_id,
            name: feedback.category.name,
            description: feedback.category.description,
            metadata: feedback.category.metadata as CategoryResponse['metadata'],
            is_active: feedback.category.is_active,
            created_at: feedback.category.created_at.toISOString(),
            updated_at: feedback.category.updated_at.toISOString()
          }
        : undefined,
      family_user: feedback.family_user,
      assigned_staff: feedback.assigned_staff || null,
      institution: feedback.institution
    }
  }
}

export const feedbackService = new FeedbackService()
