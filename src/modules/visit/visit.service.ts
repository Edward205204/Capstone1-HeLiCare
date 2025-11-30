import { VisitStatus, VisitTimeBlock, ActivityStatus } from '@prisma/client'
import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { CreateVisitReqBody, UpdateVisitReqBody, ApproveVisitReqBody } from './visit.dto'
import jwt from 'jsonwebtoken'
import { env } from '~/utils/dot.env'

class VisitService {
  // Tạo lịch hẹn thăm viếng mới với logic cải tiến
  createVisit = async (family_user_id: string, visitData: CreateVisitReqBody) => {
    const { resident_id, visit_date, visit_time, time_block, duration = 60, purpose, notes } = visitData

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
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const visitDate = new Date(visit_date)
    visitDate.setHours(0, 0, 0, 0)

    // Kiểm tra ngày không được trong quá khứ
    if (visitDate < today) {
      throw new ErrorWithStatus({
        message: 'Visit date cannot be in the past',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Nếu có config, kiểm tra advance booking days
    if (config) {
      const maxAdvanceDays = config.advance_booking_days || 30 // Default 30 days
      const maxDate = new Date(today.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000)

      if (visitDate > maxDate) {
        throw new ErrorWithStatus({
          message: `Visit date cannot be more than ${maxAdvanceDays} days in the future`,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    // Nếu có time_block, sử dụng time_block (new system)
    if (time_block) {
      // Kiểm tra time block đã qua nếu là ngày hôm nay
      if (visitDate.getTime() === today.getTime()) {
        const now = new Date()
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const currentTime = currentHour * 60 + currentMinute // Total minutes from midnight

        // Define time block ranges (in minutes from midnight)
        // Morning: 6:00 (360) - 12:00 (720)
        // Afternoon: 12:00 (720) - 18:00 (1080)
        // Evening: 18:00 (1080) - 22:00 (1320)
        if (time_block === 'morning' && currentTime >= 720) {
          throw new ErrorWithStatus({
            message: 'Buổi sáng đã qua, không thể đặt lịch cho khung giờ này',
            status: HTTP_STATUS.BAD_REQUEST
          })
        }
        if (time_block === 'afternoon' && currentTime >= 1080) {
          throw new ErrorWithStatus({
            message: 'Buổi chiều đã qua, không thể đặt lịch cho khung giờ này',
            status: HTTP_STATUS.BAD_REQUEST
          })
        }
        if (time_block === 'evening' && currentTime >= 1320) {
          throw new ErrorWithStatus({
            message: 'Buổi tối đã qua, không thể đặt lịch cho khung giờ này',
            status: HTTP_STATUS.BAD_REQUEST
          })
        }
      }

      // Kiểm tra family đã có lịch hẹn trong cùng thời gian chưa (luôn check, không phụ thuộc config)
      // Normalize visitDate to start of day for accurate comparison
      const visitDateStart = new Date(visitDate)
      visitDateStart.setHours(0, 0, 0, 0)
      const visitDateEnd = new Date(visitDateStart)
      visitDateEnd.setHours(23, 59, 59, 999)

      const existingVisit = await prisma.visit.findFirst({
        where: {
          family_user_id,
          resident_id,
          visit_date: {
            gte: visitDateStart,
            lte: visitDateEnd
          },
          time_block,
          status: {
            in: [VisitStatus.pending, VisitStatus.approved, VisitStatus.scheduled]
          }
        }
      })

      if (existingVisit) {
        throw new ErrorWithStatus({
          message: 'You already have a visit scheduled at this time block',
          status: HTTP_STATUS.CONFLICT
        })
      }

      // Kiểm tra xung đột với schedule của resident
      // Time block ranges (in hours):
      // Morning: 6:00 - 12:00
      // Afternoon: 12:00 - 18:00
      // Evening: 18:00 - 22:00
      const timeBlockRanges: Record<string, { start: number; end: number }> = {
        morning: { start: 6, end: 12 },
        afternoon: { start: 12, end: 18 },
        evening: { start: 18, end: 22 }
      }

      const timeBlockRange = timeBlockRanges[time_block]
      if (timeBlockRange) {
        const blockStart = new Date(visitDateStart)
        blockStart.setHours(timeBlockRange.start, 0, 0, 0)
        const blockEnd = new Date(visitDateStart)
        blockEnd.setHours(timeBlockRange.end, 0, 0, 0)

        // Check if resident has any schedule that overlaps with this time block
        const conflictingSchedule = await prisma.schedule.findFirst({
          where: {
            resident_id: resident_id,
            start_time: {
              lt: blockEnd
            },
            end_time: {
              gt: blockStart
            },
            status: {
              in: [ActivityStatus.planned, ActivityStatus.participated] // Only check active schedules
            }
          }
        })

        if (conflictingSchedule) {
          throw new ErrorWithStatus({
            message: 'Resident has a scheduled activity at this time block. Please choose another time.',
            status: HTTP_STATUS.CONFLICT
          })
        }
      }

      // Chỉ check max capacity nếu có config
      if (config) {
        // Kiểm tra giới hạn theo ngày
        const dailyStats = await this.getOrCreateDailyStats(resident.institution_id!, visit_date)
        if (dailyStats.total_visitors >= config.max_visitors_per_day) {
          // Trả về suggestions khi full
          const suggestions = await this.getAvailabilitySuggestions(
            resident.institution_id!,
            visit_date,
            time_block,
            config
          )
          throw new ErrorWithStatus({
            message: 'Daily visitor limit reached',
            status: HTTP_STATUS.BAD_REQUEST,
            suggestions
          })
        }

        // Kiểm tra giới hạn theo time block
        const timeBlockVisitors = await this.getTimeBlockVisitorCount(resident.institution_id!, visit_date, time_block)
        if (timeBlockVisitors >= config.max_visitors_per_time_block) {
          // Trả về suggestions khi full
          const suggestions = await this.getAvailabilitySuggestions(
            resident.institution_id!,
            visit_date,
            time_block,
            config
          )
          throw new ErrorWithStatus({
            message: 'Time block is full',
            status: HTTP_STATUS.BAD_REQUEST,
            suggestions
          })
        }
      }
    } else if (visit_time) {
      // Backward compatibility: sử dụng visit_time (old system)
      const visitDateTime = new Date(`${visit_date}T${visit_time}:00`)
      const timeSlots = institution.visitTimeSlots

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

      // Kiểm tra family đã có lịch hẹn trong cùng thời gian chưa (luôn check, không phụ thuộc config)
      const existingVisit = await prisma.visit.findFirst({
        where: {
          family_user_id,
          resident_id,
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

      // Chỉ check max capacity nếu có config
      if (config) {
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
        const residentSlotVisitors = await this.getResidentSlotVisitorCount(
          resident_id,
          visit_date,
          selectedSlot.slot_id
        )
        if (residentSlotVisitors >= config.max_visitors_per_resident_per_slot) {
          throw new ErrorWithStatus({
            message: 'Maximum visitors for this resident in this time slot reached',
            status: HTTP_STATUS.BAD_REQUEST
          })
        }
      }
    } else {
      throw new ErrorWithStatus({
        message: 'Either time_block or visit_time must be provided',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Sử dụng transaction để đảm bảo ACID
    const visitDateObj = new Date(visit_date)
    visitDateObj.setHours(0, 0, 0, 0)

    const result = await prisma.$transaction(async (tx) => {
      // Xóa bất kỳ visit cancelled nào ở cùng thời điểm để tránh unique constraint violation
      // Điều này cho phép user tạo lại lịch ở cùng thời điểm sau khi hủy
      if (time_block) {
        await tx.visit.deleteMany({
          where: {
            family_user_id,
            resident_id,
            visit_date: visitDateObj,
            time_block,
            status: VisitStatus.cancelled
          }
        })
      } else if (visit_time) {
        const visitDateTime = new Date(`${visit_date}T${visit_time}:00`)
        await tx.visit.deleteMany({
          where: {
            family_user_id,
            resident_id,
            visit_date: visitDateTime,
            visit_time,
            status: VisitStatus.cancelled
          }
        })
      }

      // Tạo visit
      const visit = await tx.visit.create({
        data: {
          family_user_id,
          resident_id,
          institution_id: resident.institution_id!,
          visit_date: visitDateObj,
          visit_time: visit_time || null,
          time_block: time_block || null,
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
      const qrCodeData = this.generateQRCodeData(
        visit.visit_id,
        resident_id,
        family_user_id,
        resident.institution_id!,
        visitDateObj,
        time_block || null
      )
      const qrExpiresAt = new Date(visitDateObj.getTime() + 24 * 60 * 60 * 1000) // 24 hours

      // Cập nhật visit với QR code data
      const updatedVisit = await tx.visit.update({
        where: { visit_id: visit.visit_id },
        data: {
          qr_code_data: qrCodeData,
          qr_expires_at: qrExpiresAt
        }
      })

      // Tạo VisitSlot nếu có visit_time (old system)
      if (visit_time && !time_block) {
        const timeSlots = institution.visitTimeSlots
        const visitDateTime = new Date(`${visit_date}T${visit_time}:00`)
        const selectedSlot = timeSlots.find((slot) => {
          const slotStart = new Date(`${visit_date}T${slot.start_time}:00`)
          const slotEnd = new Date(`${visit_date}T${slot.end_time}:00`)
          return visitDateTime >= slotStart && visitDateTime < slotEnd
        })

        if (selectedSlot) {
          await tx.visitSlot.create({
            data: {
              visit_id: visit.visit_id,
              slot_id: selectedSlot.slot_id
            }
          })
          // Cập nhật daily stats (chỉ nếu có config)
          if (config) {
            await this.updateDailyStatsInTransaction(tx, resident.institution_id!, visit_date, selectedSlot.slot_id)
          }
        }
      } else if (time_block) {
        // Cập nhật daily stats cho time block (chỉ nếu có config)
        if (config) {
          await this.updateDailyStatsForTimeBlockInTransaction(tx, resident.institution_id!, visit_date, time_block)
        }
      }

      return {
        ...updatedVisit,
        qr_code_data: qrCodeData,
        time_block: time_block || null
      }
    })

    return result
  }

  // Kiểm tra availability cho một ngày
  checkAvailability = async (institution_id: string, date: string) => {
    const institution = await prisma.institution.findUnique({
      where: { institution_id },
      include: {
        visitConfiguration: true
      }
    })

    if (!institution) {
      throw new ErrorWithStatus({
        message: 'Institution not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const config = institution.visitConfiguration
    const dailyStats = await this.getOrCreateDailyStats(institution_id, date)

    // Kiểm tra availability cho từng time block
    const timeBlocks: VisitTimeBlock[] = ['morning', 'afternoon', 'evening']
    const availability = await Promise.all(
      timeBlocks.map(async (timeBlock) => {
        const timeBlockVisitors = await this.getTimeBlockVisitorCount(institution_id, date, timeBlock)

        // Nếu không có config, luôn available (unlimited)
        if (!config) {
          return {
            time_block: timeBlock,
            current_visitors: timeBlockVisitors,
            max_visitors: null, // Unlimited
            is_available: true
          }
        }

        const isAvailable = timeBlockVisitors < config.max_visitors_per_time_block
        return {
          time_block: timeBlock,
          current_visitors: timeBlockVisitors,
          max_visitors: config.max_visitors_per_time_block,
          is_available: isAvailable
        }
      })
    )

    return {
      date,
      total_visitors: dailyStats.total_visitors,
      max_visitors_per_day: config?.max_visitors_per_day || null, // null means unlimited
      is_day_available: config ? dailyStats.total_visitors < config.max_visitors_per_day : true,
      time_blocks: availability
    }
  }

  // Check-in với QR code
  checkIn = async (qrCodeData: string, _staff_id: string) => {
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
  private generateQRCodeData(
    visit_id: string,
    resident_id: string,
    family_user_id: string,
    institution_id: string,
    visit_date: Date,
    time_block: VisitTimeBlock | null
  ): string {
    const payload: any = {
      visit_id,
      resident_id,
      family_user_id,
      institution_id,
      visit_date: visit_date.toISOString(),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 24 hours
    }

    if (time_block) {
      payload.time_block = time_block
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

  // Get visits by resident_id (for Resident role)
  getVisitsByResident = async (resident_id: string, status?: VisitStatus, limit = 100, offset = 0) => {
    const where: any = {
      resident_id
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
        family_user: {
          select: {
            familyProfile: {
              select: {
                full_name: true,
                phone: true
              }
            }
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

  // Helper methods for time blocks
  private async getTimeBlockVisitorCount(
    institution_id: string,
    date: string,
    time_block: VisitTimeBlock
  ): Promise<number> {
    const visitDate = new Date(date)
    visitDate.setHours(0, 0, 0, 0)
    const nextDay = new Date(visitDate)
    nextDay.setDate(nextDay.getDate() + 1)

    const count = await prisma.visit.count({
      where: {
        institution_id,
        visit_date: {
          gte: visitDate,
          lt: nextDay
        },
        time_block,
        status: {
          in: [VisitStatus.scheduled, VisitStatus.checked_in, VisitStatus.completed]
        }
      }
    })

    return count
  }

  private async updateDailyStatsForTimeBlock(institution_id: string, date: string, time_block: VisitTimeBlock) {
    const visitDate = new Date(date)
    visitDate.setHours(0, 0, 0, 0)
    const stats = await this.getOrCreateDailyStats(institution_id, date)

    await prisma.visitDailyStats.update({
      where: {
        institution_id_visit_date: {
          institution_id,
          visit_date: visitDate
        }
      },
      data: {
        total_visitors: stats.total_visitors + 1
      }
    })
  }

  // Transaction version of updateDailyStatsForTimeBlock
  private async updateDailyStatsForTimeBlockInTransaction(
    tx: any,
    institution_id: string,
    date: string,
    time_block: VisitTimeBlock
  ) {
    const visitDate = new Date(date)
    visitDate.setHours(0, 0, 0, 0)
    const stats = await this.getOrCreateDailyStatsInTransaction(tx, institution_id, date)

    await tx.visitDailyStats.update({
      where: {
        institution_id_visit_date: {
          institution_id,
          visit_date: visitDate
        }
      },
      data: {
        total_visitors: stats.total_visitors + 1
      }
    })
  }

  // Transaction version of updateDailyStats
  private async updateDailyStatsInTransaction(tx: any, institution_id: string, date: string, slot_id: string) {
    const visitDate = new Date(date)
    const stats = await this.getOrCreateDailyStatsInTransaction(tx, institution_id, date)

    const visitorsBySlot = { ...((stats.visitors_by_slot as Record<string, number>) || {}) }
    visitorsBySlot[slot_id] = (visitorsBySlot[slot_id] || 0) + 1

    await tx.visitDailyStats.update({
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

  // Transaction version of getOrCreateDailyStats
  private async getOrCreateDailyStatsInTransaction(tx: any, institution_id: string, date: string) {
    const visitDate = new Date(date)
    let stats = await tx.visitDailyStats.findUnique({
      where: {
        institution_id_visit_date: {
          institution_id,
          visit_date: visitDate
        }
      }
    })

    if (!stats) {
      stats = await tx.visitDailyStats.create({
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

  private async getAvailabilitySuggestions(
    institution_id: string,
    requestedDate: string,
    requestedTimeBlock: VisitTimeBlock,
    config: { max_visitors_per_time_block: number; advance_booking_days: number }
  ) {
    const suggestions: Array<{ date: string; time_block: VisitTimeBlock; available_slots: number }> = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDate = new Date(today.getTime() + config.advance_booking_days * 24 * 60 * 60 * 1000)

    // Kiểm tra các ngày trong tương lai (tối đa 7 ngày)
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() + i)

      if (checkDate > maxDate) break

      const dateStr = checkDate.toISOString().split('T')[0]
      const timeBlocks: VisitTimeBlock[] = ['morning', 'afternoon', 'evening']

      for (const timeBlock of timeBlocks) {
        // Bỏ qua time block đã được yêu cầu nếu cùng ngày
        if (dateStr === requestedDate && timeBlock === requestedTimeBlock) {
          continue
        }

        const timeBlockVisitors = await this.getTimeBlockVisitorCount(institution_id, dateStr, timeBlock)
        const availableSlots = Math.max(0, config.max_visitors_per_time_block - timeBlockVisitors)

        if (availableSlots > 0) {
          suggestions.push({
            date: dateStr,
            time_block: timeBlock,
            available_slots: availableSlots
          })
        }
      }
    }

    // Sắp xếp theo ngày và time block
    suggestions.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date)
      }
      const order: Record<VisitTimeBlock, number> = { morning: 0, afternoon: 1, evening: 2 }
      return order[a.time_block] - order[b.time_block]
    })

    return suggestions.slice(0, 10) // Trả về tối đa 10 suggestions
  }
}

const visitService = new VisitService()

export { visitService, VisitService }
