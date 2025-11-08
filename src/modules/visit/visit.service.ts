import { VisitStatus } from '@prisma/client'
import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { CreateVisitReqBody, UpdateVisitReqBody, ApproveVisitReqBody } from './visit.dto'
import jwt from 'jsonwebtoken'
import { env } from '~/utils/dot.env'

class VisitService {
  // Tạo lịch hẹn thăm viếng mới với logic cải tiến
  createVisit = async (family_user_id: string, visitData: CreateVisitReqBody) => {
    const { resident_id, visit_date, visit_time, duration = 60, purpose, notes } = visitData

    // Lấy thông tin resident và institution
    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      include: {
        familyResidentLinks: {
          where: {
            family_user_id,
            status: 'active'
          }
        },
        institution: {
          include: {
            visitConfiguration: true,
            visitTimeSlots: {
              where: { is_active: true },
              orderBy: { start_time: 'asc' }
            }
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

    const institution = resident.institution
    if (!institution) {
      throw new ErrorWithStatus({
        message: 'Institution not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const config = institution.visitConfiguration
    const timeSlots = institution.visitTimeSlots

    if (!config) {
      throw new ErrorWithStatus({
        message: 'Visit configuration not found for this institution',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const visitDateTime = new Date(`${visit_date}T${visit_time}:00`)
    const today = new Date()
    const maxAdvanceDays = config.advance_booking_days
    const maxDate = new Date(today.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000)

    // Kiểm tra ngày đặt lịch có trong khoảng cho phép không
    if (visitDateTime < today || visitDateTime > maxDate) {
      throw new ErrorWithStatus({
        message: `Visit date must be between today and ${maxAdvanceDays} days from now`,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Tìm time slot phù hợp
    const selectedSlot = timeSlots.find((slot) => {
      const slotStart = new Date(`${visit_date}T${slot.start_time}:00`)
      const slotEnd = new Date(`${visit_date}T${slot.end_time}:00`)
      return visitDateTime >= slotStart && visitDateTime < slotEnd
    })

    if (!selectedSlot) {
      throw new ErrorWithStatus({
        message: 'No valid time slot found for the selected time',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Kiểm tra giới hạn theo ngày
    const dailyStats = await this.getOrCreateDailyStats(resident.institution_id!, visit_date)
    if (dailyStats.total_visitors >= config.max_visitors_per_day) {
      throw new ErrorWithStatus({
        message: 'Daily visitor limit reached',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Kiểm tra giới hạn theo slot
    const slotVisitors = await this.getSlotVisitorCount(resident.institution_id!, visit_date, selectedSlot.slot_id)
    if (slotVisitors >= config.max_visitors_per_slot) {
      throw new ErrorWithStatus({
        message: 'Time slot is full',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Kiểm tra giới hạn theo resident trong slot
    const residentSlotVisitors = await this.getResidentSlotVisitorCount(resident_id, visit_date, selectedSlot.slot_id)
    if (residentSlotVisitors >= config.max_visitors_per_resident_per_slot) {
      throw new ErrorWithStatus({
        message: 'Maximum visitors for this resident in this time slot reached',
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
          in: [VisitStatus.pending, VisitStatus.approved, VisitStatus.scheduled]
        }
      }
    })

    if (existingVisit) {
      throw new ErrorWithStatus({
        message: 'You already have a visit scheduled at this time',
        status: HTTP_STATUS.CONFLICT
      })
    }

    // Tạo visit trước để có visit_id
    const visit = await prisma.visit.create({
      data: {
        family_user_id,
        resident_id,
        institution_id: resident.institution_id!,
        visit_date: visitDateTime,
        visit_time,
        duration,
        purpose,
        notes,
        status: VisitStatus.scheduled
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

    // Tạo QR code data với visit_id
    const qrCodeData = this.generateQRCodeData(visit.visit_id, resident_id, family_user_id, visitDateTime)
    const qrExpiresAt = new Date(visitDateTime.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    // Cập nhật visit với QR code data
    const updatedVisit = await prisma.visit.update({
      where: { visit_id: visit.visit_id },
      data: {
        qr_code_data: qrCodeData,
        qr_expires_at: qrExpiresAt
      }
    })

    // Tạo VisitSlot
    await prisma.visitSlot.create({
      data: {
        visit_id: visit.visit_id,
        slot_id: selectedSlot.slot_id
      }
    })

    // Cập nhật daily stats
    await this.updateDailyStats(resident.institution_id!, visit_date, selectedSlot.slot_id)

    return {
      ...updatedVisit,
      qr_code_data: qrCodeData,
      time_slot: {
        name: selectedSlot.name,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time
      }
    }
  }

  // Kiểm tra availability cho một ngày
  checkAvailability = async (institution_id: string, date: string) => {
    const institution = await prisma.institution.findUnique({
      where: { institution_id },
      include: {
        visitConfiguration: true,
        visitTimeSlots: {
          where: { is_active: true },
          orderBy: { start_time: 'asc' }
        }
      }
    })

    if (!institution || !institution.visitConfiguration) {
      throw new ErrorWithStatus({
        message: 'Institution or configuration not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const config = institution.visitConfiguration
    const timeSlots = institution.visitTimeSlots
    const dailyStats = await this.getOrCreateDailyStats(institution_id, date)

    const availability = timeSlots.map((slot) => {
      const visitorsBySlot = (dailyStats.visitors_by_slot as Record<string, number>) || {}
      const slotVisitors = visitorsBySlot[slot.slot_id] || 0
      const isAvailable = slotVisitors < config.max_visitors_per_slot

      return {
        slot_id: slot.slot_id,
        name: slot.name,
        start_time: slot.start_time,
        end_time: slot.end_time,
        current_visitors: slotVisitors,
        max_visitors: config.max_visitors_per_slot,
        is_available: isAvailable
      }
    })

    return {
      date,
      total_visitors: dailyStats.total_visitors,
      max_visitors_per_day: config.max_visitors_per_day,
      is_day_available: dailyStats.total_visitors < config.max_visitors_per_day,
      time_slots: availability
    }
  }

  // Check-in với QR code
  checkIn = async (qrCodeData: string, _staff_id: string) => {
    // Giải mã QR code
    const decoded = this.decodeQRCodeData(qrCodeData)
    if (!decoded) {
      throw new ErrorWithStatus({
        message: 'Invalid QR code',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const { visit_id } = decoded

    // Tìm visit
    const visit = await prisma.visit.findUnique({
      where: { visit_id },
      include: {
        resident: {
          select: {
            full_name: true,
            room: {
              select: {
                room_number: true
              }
            }
          }
        },
        family_user: {
          select: {
            familyProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      }
    })

    if (!visit) {
      throw new ErrorWithStatus({
        message: 'Visit not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Kiểm tra các điều kiện
    if (visit.status !== VisitStatus.scheduled) {
      throw new ErrorWithStatus({
        message: 'Visit is not in scheduled status',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const today = new Date()
    const visitDate = new Date(visit.visit_date)
    const isToday = visitDate.toDateString() === today.toDateString()

    if (!isToday) {
      throw new ErrorWithStatus({
        message: 'QR code is not valid for today',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Kiểm tra QR code hết hạn
    if (visit.qr_expires_at && visit.qr_expires_at < today) {
      throw new ErrorWithStatus({
        message: 'QR code has expired',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Cập nhật status
    await prisma.visit.update({
      where: { visit_id },
      data: {
        status: VisitStatus.checked_in,
        checked_in_at: today
      }
    })

    return {
      success: true,
      visit: {
        visit_id: visit.visit_id,
        resident_name: visit.resident.full_name,
        family_name: visit.family_user.familyProfile?.full_name,
        room_number: visit.resident.room?.room_number,
        check_in_time: today
      }
    }
  }

  // Hủy lịch hẹn
  cancelVisit = async (visit_id: string, family_user_id: string) => {
    const visit = await prisma.visit.findFirst({
      where: {
        visit_id,
        family_user_id,
        status: {
          in: [VisitStatus.scheduled, VisitStatus.approved]
        }
      }
    })

    if (!visit) {
      throw new ErrorWithStatus({
        message: 'Visit not found or cannot be cancelled',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Kiểm tra thời gian hủy
    const institution = await prisma.institution.findUnique({
      where: { institution_id: visit.institution_id },
      include: { visitConfiguration: true }
    })

    if (institution?.visitConfiguration) {
      const config = institution.visitConfiguration
      const visitDateTime = new Date(visit.visit_date)
      const now = new Date()
      const hoursUntilVisit = (visitDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

      if (hoursUntilVisit < config.cancellation_hours) {
        throw new ErrorWithStatus({
          message: `Visit can only be cancelled ${config.cancellation_hours} hours before the scheduled time`,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    // Cập nhật status
    const updatedVisit = await prisma.visit.update({
      where: { visit_id },
      data: {
        status: VisitStatus.cancelled
      }
    })

    // Cập nhật daily stats (giảm counter)
    await this.decreaseDailyStats(visit.institution_id, visit.visit_date)

    return updatedVisit
  }

  // Check-out
  checkOut = async (visit_id: string, _staff_id: string) => {
    const visit = await prisma.visit.findUnique({
      where: { visit_id }
    })

    if (!visit) {
      throw new ErrorWithStatus({
        message: 'Visit not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (visit.status !== VisitStatus.checked_in) {
      throw new ErrorWithStatus({
        message: 'Visit is not checked in',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const updatedVisit = await prisma.visit.update({
      where: { visit_id },
      data: {
        status: VisitStatus.completed,
        checked_out_at: new Date()
      }
    })

    return updatedVisit
  }

  // Helper methods
  private generateQRCodeData(visit_id: string, resident_id: string, family_user_id: string, visit_date: Date): string {
    const payload = {
      visit_id,
      resident_id,
      family_user_id,
      visit_date: visit_date.toISOString(),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 24 hours
    }

    return jwt.sign(payload, env.JWT_SECRET_KEY_COMMON_TOKEN as string)
  }

  private decodeQRCodeData(qrCodeData: string): any {
    try {
      return jwt.verify(qrCodeData, env.JWT_SECRET_KEY_COMMON_TOKEN as string)
    } catch {
      return null
    }
  }

  private async getOrCreateDailyStats(institution_id: string, date: string) {
    const visitDate = new Date(date)
    let stats = await prisma.visitDailyStats.findUnique({
      where: {
        institution_id_visit_date: {
          institution_id,
          visit_date: visitDate
        }
      }
    })

    if (!stats) {
      stats = await prisma.visitDailyStats.create({
        data: {
          institution_id,
          visit_date: visitDate,
          total_visitors: 0,
          visitors_by_slot: {}
        }
      })
    }

    return stats
  }

  private async getSlotVisitorCount(institution_id: string, date: string, slot_id: string): Promise<number> {
    const stats = await this.getOrCreateDailyStats(institution_id, date)
    const visitorsBySlot = (stats.visitors_by_slot as Record<string, number>) || {}
    return visitorsBySlot[slot_id] || 0
  }

  private async getResidentSlotVisitorCount(resident_id: string, date: string, slot_id: string): Promise<number> {
    const visitDate = new Date(date)
    const count = await prisma.visit.count({
      where: {
        resident_id,
        visit_date: {
          gte: new Date(visitDate.toDateString() + 'T00:00:00'),
          lt: new Date(visitDate.toDateString() + 'T23:59:59')
        },
        status: {
          in: [VisitStatus.scheduled, VisitStatus.checked_in, VisitStatus.completed]
        },
        visit_slot: {
          slot_id
        }
      }
    })
    return count
  }

  private async updateDailyStats(institution_id: string, date: string, slot_id: string) {
    const visitDate = new Date(date)
    const stats = await this.getOrCreateDailyStats(institution_id, date)

    const visitorsBySlot = { ...((stats.visitors_by_slot as Record<string, number>) || {}) }
    visitorsBySlot[slot_id] = (visitorsBySlot[slot_id] || 0) + 1

    await prisma.visitDailyStats.update({
      where: {
        institution_id_visit_date: {
          institution_id,
          visit_date: visitDate
        }
      },
      data: {
        total_visitors: stats.total_visitors + 1,
        visitors_by_slot: visitorsBySlot
      }
    })
  }

  private async decreaseDailyStats(institution_id: string, visit_date: Date) {
    const visitDate = new Date(visit_date)
    const stats = await prisma.visitDailyStats.findUnique({
      where: {
        institution_id_visit_date: {
          institution_id,
          visit_date: visitDate
        }
      }
    })

    if (stats) {
      await prisma.visitDailyStats.update({
        where: {
          institution_id_visit_date: {
            institution_id,
            visit_date: visitDate
          }
        },
        data: {
          total_visitors: Math.max(0, stats.total_visitors - 1)
        }
      })
    }
  }

  getVisitsByFamily = async (user_id: string, status?: VisitStatus, limit = 20, offset = 0, user_role?: string) => {
    const where: any = {}

    if (user_role === 'Family') {
      where.family_user_id = user_id
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
        }
      },
      orderBy: { visit_date: 'desc' },
      take: limit,
      skip: offset
    })

    const total = await prisma.visit.count({ where })
    return { visits, total }
  }

  getVisitsByDate = async (date: string, institution_id: string) => {
    const visitDate = new Date(date)
    const visits = await prisma.visit.findMany({
      where: {
        institution_id,
        visit_date: {
          gte: new Date(visitDate.toDateString() + 'T00:00:00'),
          lt: new Date(visitDate.toDateString() + 'T23:59:59')
        }
      },
      include: {
        family_user: {
          select: {
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
            full_name: true,
            room: {
              select: {
                room_number: true
              }
            }
          }
        }
      },
      orderBy: { visit_time: 'asc' }
    })

    return visits
  }

  getVisitById = async (visit_id: string) => {
    return await prisma.visit.findUnique({
      where: { visit_id },
      include: {
        family_user: {
          select: {
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
  }

  updateVisit = async (visit_id: string, updateData: UpdateVisitReqBody) => {
    return await prisma.visit.update({
      where: { visit_id },
      data: updateData
    })
  }

  approveVisit = async (visit_id: string, approver_id: string, approveData: ApproveVisitReqBody) => {
    return await prisma.visit.update({
      where: { visit_id },
      data: {
        status: approveData.status,
        approved_by: approver_id,
        approved_at: new Date()
      }
    })
  }

  deleteVisit = async (visit_id: string) => {
    return await prisma.visit.delete({
      where: { visit_id }
    })
  }

  getVisitStats = async (institution_id: string) => {
    const [total, pending, approved, scheduled, checkedIn, completed, cancelled] = await Promise.all([
      prisma.visit.count({ where: { institution_id } }),
      prisma.visit.count({ where: { institution_id, status: VisitStatus.pending } }),
      prisma.visit.count({ where: { institution_id, status: VisitStatus.approved } }),
      prisma.visit.count({ where: { institution_id, status: VisitStatus.scheduled } }),
      prisma.visit.count({ where: { institution_id, status: VisitStatus.checked_in } }),
      prisma.visit.count({ where: { institution_id, status: VisitStatus.completed } }),
      prisma.visit.count({ where: { institution_id, status: VisitStatus.cancelled } })
    ])

    return {
      total,
      pending,
      approved,
      scheduled,
      checked_in: checkedIn,
      completed,
      cancelled
    }
  }
}

const visitService = new VisitService()

export { visitService, VisitService }
