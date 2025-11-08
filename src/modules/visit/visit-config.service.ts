import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'

class VisitConfigService {
  // Tạo cấu hình thăm viếng cho institution
  createConfiguration = async (
    institution_id: string,
    configData: {
      max_visitors_per_day?: number
      max_visitors_per_slot?: number
      max_visitors_per_resident_per_slot?: number
      advance_booking_days?: number
      cancellation_hours?: number
    }
  ) => {
    const institution = await prisma.institution.findUnique({
      where: { institution_id }
    })

    if (!institution) {
      throw new ErrorWithStatus({
        message: 'Institution not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const existingConfig = await prisma.visitConfiguration.findUnique({
      where: { institution_id }
    })

    if (existingConfig) {
      throw new ErrorWithStatus({
        message: 'Visit configuration already exists for this institution',
        status: HTTP_STATUS.CONFLICT
      })
    }

    const config = await prisma.visitConfiguration.create({
      data: {
        institution_id,
        max_visitors_per_day: configData.max_visitors_per_day || 100,
        max_visitors_per_slot: configData.max_visitors_per_slot || 50,
        max_visitors_per_resident_per_slot: configData.max_visitors_per_resident_per_slot || 3,
        advance_booking_days: configData.advance_booking_days || 14,
        cancellation_hours: configData.cancellation_hours || 2
      }
    })

    return config
  }

  updateConfiguration = async (
    institution_id: string,
    configData: {
      max_visitors_per_day?: number
      max_visitors_per_slot?: number
      max_visitors_per_resident_per_slot?: number
      advance_booking_days?: number
      cancellation_hours?: number
    }
  ) => {
    const config = await prisma.visitConfiguration.findUnique({
      where: { institution_id }
    })

    if (!config) {
      throw new ErrorWithStatus({
        message: 'Visit configuration not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const updatedConfig = await prisma.visitConfiguration.update({
      where: { institution_id },
      data: configData
    })

    return updatedConfig
  }

  // Lấy cấu hình
  getConfiguration = async (institution_id: string) => {
    const config = await prisma.visitConfiguration.findUnique({
      where: { institution_id }
    })

    if (!config) {
      throw new ErrorWithStatus({
        message: 'Visit configuration not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return config
  }

  // Tạo time slot
  createTimeSlot = async (
    institution_id: string,
    slotData: {
      name: string
      start_time: string
      end_time: string
    }
  ) => {
    // Kiểm tra institution có tồn tại không
    const institution = await prisma.institution.findUnique({
      where: { institution_id }
    })

    if (!institution) {
      throw new ErrorWithStatus({
        message: 'Institution not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Kiểm tra time slot có trùng lặp không
    const existingSlot = await prisma.visitTimeSlot.findFirst({
      where: {
        institution_id,
        name: slotData.name
      }
    })

    if (existingSlot) {
      throw new ErrorWithStatus({
        message: 'Time slot with this name already exists',
        status: HTTP_STATUS.CONFLICT
      })
    }

    const slot = await prisma.visitTimeSlot.create({
      data: {
        institution_id,
        name: slotData.name,
        start_time: slotData.start_time,
        end_time: slotData.end_time
      }
    })

    return slot
  }

  // Lấy danh sách time slots
  getTimeSlots = async (institution_id: string) => {
    const slots = await prisma.visitTimeSlot.findMany({
      where: { institution_id },
      orderBy: { start_time: 'asc' }
    })

    return slots
  }

  // Cập nhật time slot
  updateTimeSlot = async (
    slot_id: string,
    slotData: {
      name?: string
      start_time?: string
      end_time?: string
      is_active?: boolean
    }
  ) => {
    const slot = await prisma.visitTimeSlot.findUnique({
      where: { slot_id }
    })

    if (!slot) {
      throw new ErrorWithStatus({
        message: 'Time slot not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const updatedSlot = await prisma.visitTimeSlot.update({
      where: { slot_id },
      data: slotData
    })

    return updatedSlot
  }

  // Xóa time slot
  deleteTimeSlot = async (slot_id: string) => {
    const slot = await prisma.visitTimeSlot.findUnique({
      where: { slot_id }
    })

    if (!slot) {
      throw new ErrorWithStatus({
        message: 'Time slot not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Kiểm tra có visit nào đang sử dụng slot này không
    const visitsUsingSlot = await prisma.visitSlot.count({
      where: { slot_id }
    })

    if (visitsUsingSlot > 0) {
      throw new ErrorWithStatus({
        message: 'Cannot delete time slot that is being used by visits',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    await prisma.visitTimeSlot.delete({
      where: { slot_id }
    })

    return { message: 'Time slot deleted successfully' }
  }

  // Khởi tạo cấu hình mặc định cho institution
  initializeDefaultConfiguration = async (institution_id: string) => {
    // Tạo cấu hình mặc định
    const config = await this.createConfiguration(institution_id, {
      max_visitors_per_day: 100,
      max_visitors_per_slot: 50,
      max_visitors_per_resident_per_slot: 3,
      advance_booking_days: 14,
      cancellation_hours: 2
    })

    // Tạo time slots mặc định
    const defaultSlots = [
      { name: 'Sáng', start_time: '08:00', end_time: '11:00' },
      { name: 'Chiều', start_time: '14:00', end_time: '17:00' }
    ]

    const slots = []
    for (const slotData of defaultSlots) {
      const slot = await this.createTimeSlot(institution_id, slotData)
      slots.push(slot)
    }

    return {
      configuration: config,
      time_slots: slots
    }
  }
}

const visitConfigService = new VisitConfigService()

export { visitConfigService, VisitConfigService }
