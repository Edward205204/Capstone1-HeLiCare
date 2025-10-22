import { VisitStatus } from '@prisma/client'
import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { CreateVisitReqBody, UpdateVisitReqBody, ApproveVisitReqBody } from './visit.dto'

class VisitService {
  // Giới hạn số lượng family thăm viếng mỗi ngày
  private readonly DAILY_VISIT_LIMIT = 20

  // Tạo lịch hẹn thăm viếng mới
  createVisit = async (family_user_id: string, visitData: CreateVisitReqBody) => {
    const { resident_id, visit_date, visit_time, duration = 60, purpose, notes } = visitData

    // Lấy thông tin resident để lấy institution_id
    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      include: {
        familyResidentLinks: {
          where: {
            family_user_id,
            status: 'active'
          }
        }
      }
    })

    if (!resident) {
      throw new ErrorWithStatus({
        message: 'Resident not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (resident.familyResidentLinks.length === 0) {
      throw new ErrorWithStatus({
        message: 'You are not authorized to visit this resident',
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    const visitDateTime = new Date(`${visit_date}T${visit_time}:00`)

    // Kiểm tra giới hạn số lượng thăm viếng trong ngày
    const dailyVisitCount = await prisma.visit.count({
      where: {
        institution_id: resident.institution_id,
        visit_date: {
          gte: new Date(visit_date + 'T00:00:00'),
          lt: new Date(visit_date + 'T23:59:59')
        },
        status: {
          in: [VisitStatus.pending, VisitStatus.approved]
        }
      }
    })

    if (dailyVisitCount >= this.DAILY_VISIT_LIMIT) {
      throw new ErrorWithStatus({
        message: `Daily visit limit reached. Maximum ${this.DAILY_VISIT_LIMIT} visits per day.`,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Kiểm tra family đã có lịch hẹn trong cùng thời gian chưa
    const existingVisit = await prisma.visit.findFirst({
      where: {
        family_user_id,
        visit_date: visitDateTime,
        visit_time,
        status: {
          in: [VisitStatus.pending, VisitStatus.approved]
        }
      }
    })

    if (existingVisit) {
      throw new ErrorWithStatus({
        message: 'You already have a visit scheduled at this time',
        status: HTTP_STATUS.CONFLICT
      })
    }

    // Tự động duyệt lịch hẹn nếu còn slot
    const autoApprove = dailyVisitCount < this.DAILY_VISIT_LIMIT

    const visit = await prisma.visit.create({
      data: {
        family_user_id,
        resident_id,
        institution_id: resident.institution_id,
        visit_date: visitDateTime,
        visit_time,
        duration,
        purpose,
        notes,
        status: autoApprove ? VisitStatus.approved : VisitStatus.pending
      },
      include: {
        family_user: {
          select: {
            user_id: true,
            email: true,
            familyProfile: {
              select: {
                full_name: true,
                phone: true
              }
            }
          }
        },
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
        },
        institution: {
          select: {
            name: true,
            contact_info: true
          }
        }
      }
    })

    return visit
  }

  // Lấy danh sách lịch hẹn của family
  getVisitsByFamily = async (family_user_id: string, status?: VisitStatus, limit = 20, offset = 0) => {
    const where: any = {
      family_user_id
    }

    if (status) {
      where.status = status
    }

    const visits = await prisma.visit.findMany({
      where,
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
        },
        institution: {
          select: {
            name: true
          }
        },
        approver: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      },
      orderBy: {
        visit_date: 'desc'
      },
      take: limit,
      skip: offset
    })

    return visits
  }

  // Lấy danh sách lịch hẹn theo ngày
  getVisitsByDate = async (date: string, institution_id?: string) => {
    const startDate = new Date(date + 'T00:00:00')
    const endDate = new Date(date + 'T23:59:59')

    const where: any = {
      visit_date: {
        gte: startDate,
        lte: endDate
      }
    }

    if (institution_id) {
      where.institution_id = institution_id
    }

    const visits = await prisma.visit.findMany({
      where,
      include: {
        family_user: {
          select: {
            user_id: true,
            email: true,
            familyProfile: {
              select: {
                full_name: true,
                phone: true
              }
            }
          }
        },
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
        },
        institution: {
          select: {
            name: true
          }
        },
        approver: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      },
      orderBy: [
        { visit_time: 'asc' },
        { status: 'asc' }
      ]
    })

    return visits
  }

  // Lấy thông tin lịch hẹn chi tiết
  getVisitById = async (visit_id: string) => {
    const visit = await prisma.visit.findUnique({
      where: { visit_id },
      include: {
        family_user: {
          select: {
            user_id: true,
            email: true,
            familyProfile: {
              select: {
                full_name: true,
                phone: true
              }
            }
          }
        },
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
        },
        institution: {
          select: {
            name: true,
            contact_info: true
          }
        },
        approver: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      }
    })

    return visit
  }

  // Cập nhật lịch hẹn
  updateVisit = async (visit_id: string, updateData: UpdateVisitReqBody) => {
    const visit = await prisma.visit.findUnique({
      where: { visit_id }
    })

    if (!visit) {
      throw new ErrorWithStatus({
        message: 'Visit not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Chỉ cho phép cập nhật khi status là pending
    if (visit.status !== VisitStatus.pending) {
      throw new ErrorWithStatus({
        message: 'Cannot update visit that has been approved or rejected',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const { visit_date, visit_time, duration, purpose, notes } = updateData

    // Nếu cập nhật ngày/thời gian, kiểm tra lại giới hạn
    if (visit_date || visit_time) {
      const newVisitDate = visit_date ? new Date(`${visit_date}T${visit_time || visit.visit_time}:00`) : visit.visit_date
      const dateString = newVisitDate.toISOString().split('T')[0]

      const dailyVisitCount = await prisma.visit.count({
        where: {
          institution_id: visit.institution_id,
          visit_date: {
            gte: new Date(dateString + 'T00:00:00'),
            lt: new Date(dateString + 'T23:59:59')
          },
          status: {
            in: [VisitStatus.pending, VisitStatus.approved]
          },
          visit_id: { not: visit_id }
        }
      })

      if (dailyVisitCount >= this.DAILY_VISIT_LIMIT) {
        throw new ErrorWithStatus({
          message: `Daily visit limit reached. Maximum ${this.DAILY_VISIT_LIMIT} visits per day.`,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    const updatedVisit = await prisma.visit.update({
      where: { visit_id },
      data: {
        ...(visit_date && visit_time && { 
          visit_date: new Date(`${visit_date}T${visit_time}:00`),
          visit_time 
        }),
        ...(duration && { duration }),
        ...(purpose !== undefined && { purpose }),
        ...(notes !== undefined && { notes })
      },
      include: {
        family_user: {
          select: {
            user_id: true,
            email: true,
            familyProfile: {
              select: {
                full_name: true,
                phone: true
              }
            }
          }
        },
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
        },
        institution: {
          select: {
            name: true
          }
        }
      }
    })

    return updatedVisit
  }

  // Duyệt lịch hẹn
  approveVisit = async (visit_id: string, approver_id: string, approveData: ApproveVisitReqBody) => {
    const { status, notes } = approveData

    const visit = await prisma.visit.findUnique({
      where: { visit_id }
    })

    if (!visit) {
      throw new ErrorWithStatus({
        message: 'Visit not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (visit.status !== VisitStatus.pending) {
      throw new ErrorWithStatus({
        message: 'Visit has already been processed',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Nếu approve, kiểm tra lại giới hạn
    if (status === VisitStatus.approved) {
      const dateString = visit.visit_date.toISOString().split('T')[0]
      
      const dailyVisitCount = await prisma.visit.count({
        where: {
          institution_id: visit.institution_id,
          visit_date: {
            gte: new Date(dateString + 'T00:00:00'),
            lt: new Date(dateString + 'T23:59:59')
          },
          status: VisitStatus.approved,
          visit_id: { not: visit_id }
        }
      })

      if (dailyVisitCount >= this.DAILY_VISIT_LIMIT) {
        throw new ErrorWithStatus({
          message: `Daily visit limit reached. Cannot approve more visits for this date.`,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    const updatedVisit = await prisma.visit.update({
      where: { visit_id },
      data: {
        status,
        approved_by: approver_id,
        approved_at: new Date(),
        ...(notes && { notes })
      },
      include: {
        family_user: {
          select: {
            user_id: true,
            email: true,
            familyProfile: {
              select: {
                full_name: true,
                phone: true
              }
            }
          }
        },
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
        },
        institution: {
          select: {
            name: true
          }
        },
        approver: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      }
    })

    return updatedVisit
  }

  // Xóa lịch hẹn
  deleteVisit = async (visit_id: string) => {
    const visit = await prisma.visit.findUnique({
      where: { visit_id }
    })

    if (!visit) {
      throw new ErrorWithStatus({
        message: 'Visit not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Chỉ cho phép xóa khi status là pending
    if (visit.status !== VisitStatus.pending) {
      throw new ErrorWithStatus({
        message: 'Cannot delete visit that has been approved or rejected',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const deletedVisit = await prisma.visit.delete({
      where: { visit_id }
    })

    return deletedVisit
  }

  // Lấy thống kê lịch hẹn
  getVisitStats = async (institution_id?: string) => {
    const where: any = {}
    if (institution_id) {
      where.institution_id = institution_id
    }

    const stats = await prisma.visit.groupBy({
      by: ['status'],
      where,
      _count: {
        visit_id: true
      }
    })

    const totalVisits = await prisma.visit.count({ where })

    return {
      total: totalVisits,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.visit_id
        return acc
      }, {} as Record<string, number>)
    }
  }
}

const visitService = new VisitService()

export { visitService, VisitService }
