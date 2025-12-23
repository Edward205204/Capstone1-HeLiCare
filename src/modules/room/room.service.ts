import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { CreateRoomReqBody, UpdateRoomReqBody } from './room.dto'
import { transporter } from '~/utils/transporter'

class RoomService {
  // Tạo phòng mới
  createRoom = async (institution_id: string, roomData: CreateRoomReqBody) => {
    const { room_number, type, capacity, notes } = roomData

    // Kiểm tra room_number đã tồn tại trong institution chưa
    const existingRoom = await prisma.room.findFirst({
      where: {
        institution_id,
        room_number
      }
    })

    if (existingRoom) {
      throw new ErrorWithStatus({
        message: 'Room number already exists in this institution',
        status: HTTP_STATUS.CONFLICT
      })
    }

    const room = await prisma.room.create({
      data: {
        institution_id,
        room_number,
        type,
        capacity,
        current_occupancy: 0,
        is_available: true,
        notes
      }
    })

    return room
  }

  // Lấy danh sách phòng của institution
  getRoomsByInstitution = async (params: { institution_id: string; page?: number; limit?: number }) => {
    const { institution_id, page, limit } = params

    const where = { institution_id }

    const include = {
      residents: {
        select: {
          resident_id: true,
          full_name: true,
          gender: true,
          date_of_birth: true,
          admission_date: true
        }
      }
    }

    const orderBy = {
      room_number: 'asc' as const
    }

    // Nếu không có pagination, trả về tất cả rooms
    if (!page || !limit) {
      const rooms = await prisma.room.findMany({
        where,
        include,
        orderBy
      })

      // Tính lại current_occupancy từ số lượng residents thực tế và cập nhật vào database
      const updatedRooms = await Promise.all(
        rooms.map(async (room) => {
          const actualOccupancy = room.residents.length
          const isAvailable = actualOccupancy < room.capacity

          // Chỉ cập nhật nếu khác với giá trị hiện tại
          if (room.current_occupancy !== actualOccupancy || room.is_available !== isAvailable) {
            const updatedRoom = await prisma.room.update({
              where: { room_id: room.room_id },
              data: {
                current_occupancy: actualOccupancy,
                is_available: isAvailable
              },
              include
            })
            return updatedRoom
          }

          return room
        })
      )

      return {
        rooms: updatedRooms
      }
    }

    // Có pagination
    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const safePage = Math.max(page, 1)
    const skip = (safePage - 1) * safeLimit

    const [total, rooms] = await prisma.$transaction([
      prisma.room.count({ where }),
      prisma.room.findMany({
        where,
        include,
        orderBy,
        skip,
        take: safeLimit
      })
    ])

    // Tính lại current_occupancy từ số lượng residents thực tế và cập nhật vào database
    const updatedRooms = await Promise.all(
      rooms.map(async (room) => {
        const actualOccupancy = room.residents.length
        const isAvailable = actualOccupancy < room.capacity

        // Chỉ cập nhật nếu khác với giá trị hiện tại
        if (room.current_occupancy !== actualOccupancy || room.is_available !== isAvailable) {
          const updatedRoom = await prisma.room.update({
            where: { room_id: room.room_id },
            data: {
              current_occupancy: actualOccupancy,
              is_available: isAvailable
            },
            include
          })
          return updatedRoom
        }

        return room
      })
    )

    return {
      rooms: updatedRooms,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit))
      }
    }
  }

  // Lấy thông tin phòng theo ID
  getRoomById = async (room_id: string) => {
    const room = await prisma.room.findUnique({
      where: { room_id },
      include: {
        residents: {
          select: {
            resident_id: true,
            full_name: true,
            gender: true,
            date_of_birth: true,
            admission_date: true
          }
        }
      }
    })

    if (!room) {
      return null
    }

    // Tính lại current_occupancy từ số lượng residents thực tế và cập nhật vào database
    const actualOccupancy = room.residents.length
    const isAvailable = actualOccupancy < room.capacity

    // Chỉ cập nhật nếu khác với giá trị hiện tại
    if (room.current_occupancy !== actualOccupancy || room.is_available !== isAvailable) {
      const updatedRoom = await prisma.room.update({
        where: { room_id },
        data: {
          current_occupancy: actualOccupancy,
          is_available: isAvailable
        },
        include: {
          residents: {
            select: {
              resident_id: true,
              full_name: true,
              gender: true,
              date_of_birth: true,
              admission_date: true
            }
          }
        }
      })
      return updatedRoom
    }

    return room
  }

  // Cập nhật thông tin phòng
  updateRoom = async (room_id: string, updateData: UpdateRoomReqBody) => {
    const { room_number, capacity } = updateData

    // Lấy thông tin phòng hiện tại
    const room = await prisma.room.findUnique({
      where: { room_id }
    })

    if (!room) {
      throw new ErrorWithStatus({
        message: 'Room not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Nếu cập nhật room_number, kiểm tra trùng lặp
    if (room_number) {
      const existingRoom = await prisma.room.findFirst({
        where: {
          institution_id: room.institution_id,
          room_number,
          room_id: { not: room_id }
        }
      })

      if (existingRoom) {
        throw new ErrorWithStatus({
          message: 'Room number already exists in this institution',
          status: HTTP_STATUS.CONFLICT
        })
      }
    }

    // Nếu cập nhật capacity, kiểm tra capacity không nhỏ hơn current_occupancy
    if (capacity !== undefined) {
      if (capacity < room.current_occupancy) {
        throw new ErrorWithStatus({
          message: 'New capacity cannot be less than current occupancy',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }

      // Cập nhật is_available dựa trên capacity
      const is_available = capacity > room.current_occupancy

      const updatedRoom = await prisma.room.update({
        where: { room_id },
        data: {
          ...updateData,
          is_available
        }
      })

      return updatedRoom
    }

    const updatedRoom = await prisma.room.update({
      where: { room_id },
      data: updateData
    })

    return updatedRoom
  }

  // Thêm resident vào phòng
  addResidentToRoom = async (room_id: string, resident_id: string) => {
    // Kiểm tra phòng có đủ chỗ không
    const room = await prisma.room.findUnique({
      where: { room_id }
    })

    if (!room) {
      throw new ErrorWithStatus({
        message: 'Room not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (room.current_occupancy >= room.capacity) {
      throw new ErrorWithStatus({
        message: 'Room is at full capacity',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Cập nhật resident và room trong transaction
    const result = await prisma.$transaction(async (tx) => {
      // Cập nhật resident
      const updatedResident = await tx.resident.update({
        where: { resident_id },
        data: { room_id }
      })

      // Cập nhật room occupancy
      const updatedRoom = await tx.room.update({
        where: { room_id },
        data: {
          current_occupancy: room.current_occupancy + 1,
          is_available: room.current_occupancy + 1 < room.capacity
        }
      })

      return { updatedResident, updatedRoom }
    })

    return result
  }

  // Xóa resident khỏi phòng
  removeResidentFromRoom = async (room_id: string, resident_id: string) => {
    // Kiểm tra resident có trong phòng không
    const resident = await prisma.resident.findUnique({
      where: { resident_id }
    })

    if (!resident || resident.room_id !== room_id) {
      throw new ErrorWithStatus({
        message: 'Resident is not in this room',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const room = await prisma.room.findUnique({
      where: { room_id }
    })

    if (!room) {
      throw new ErrorWithStatus({
        message: 'Room not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Cập nhật resident và room trong transaction
    const result = await prisma.$transaction(async (tx) => {
      // Cập nhật resident
      const updatedResident = await tx.resident.update({
        where: { resident_id },
        data: { room_id: null }
      })

      // Cập nhật room occupancy
      const updatedRoom = await tx.room.update({
        where: { room_id },
        data: {
          current_occupancy: room.current_occupancy - 1,
          is_available: true
        }
      })

      return { updatedResident, updatedRoom }
    })

    return result
  }

  // Lấy danh sách resident trong phòng
  getResidentsInRoom = async (room_id: string) => {
    const room = await prisma.room.findUnique({
      where: { room_id },
      include: {
        residents: {
          select: {
            resident_id: true,
            full_name: true,
            gender: true,
            date_of_birth: true,
            admission_date: true,
            notes: true
          }
        }
      }
    })

    if (!room) {
      throw new ErrorWithStatus({
        message: 'Room not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return room.residents
  }

  // Xóa phòng
  deleteRoom = async (room_id: string) => {
    const room = await prisma.room.findUnique({
      where: { room_id },
      include: {
        residents: true
      }
    })

    if (!room) {
      throw new ErrorWithStatus({
        message: 'Room not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Kiểm tra phòng có resident không
    if (room.residents.length > 0) {
      throw new ErrorWithStatus({
        message: 'Cannot delete room with residents. Please remove all residents first.',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const deletedRoom = await prisma.room.delete({
      where: { room_id }
    })

    return deletedRoom
  }

  // Lấy danh sách phòng trống theo type
  getAvailableRoomsByType = async (institution_id: string, room_type: string) => {
    const rooms = await prisma.room.findMany({
      where: {
        institution_id,
        type: room_type as any,
        is_available: true,
        current_occupancy: { lt: prisma.room.fields.capacity }
      },
      orderBy: {
        room_number: 'asc'
      }
    })

    return rooms
  }

  // Tạo yêu cầu đổi phòng
  createRoomChangeRequest = async (
    resident_id: string,
    requested_by: string,
    requested_by_role: string,
    requestData: {
      requested_room_id: string
      requested_room_type: string
      reason?: string
    }
  ) => {
    // Kiểm tra resident tồn tại
    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      include: {
        room: true,
        institution: true
      }
    })

    if (!resident) {
      throw new ErrorWithStatus({
        message: 'Resident not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (!resident.institution_id) {
      throw new ErrorWithStatus({
        message: 'Resident does not belong to any institution',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Kiểm tra phòng yêu cầu có tồn tại và còn trống không
    const requestedRoom = await prisma.room.findUnique({
      where: { room_id: requestData.requested_room_id }
    })

    if (!requestedRoom) {
      throw new ErrorWithStatus({
        message: 'Requested room not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (requestedRoom.institution_id !== resident.institution_id) {
      throw new ErrorWithStatus({
        message: 'Requested room does not belong to the same institution',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    if (!requestedRoom.is_available || requestedRoom.current_occupancy >= requestedRoom.capacity) {
      throw new ErrorWithStatus({
        message: 'Requested room is not available',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    if (requestedRoom.type !== requestData.requested_room_type) {
      throw new ErrorWithStatus({
        message: 'Requested room type does not match',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Kiểm tra xem đã có request pending nào chưa
    const existingRequest = await prisma.roomChangeRequest.findFirst({
      where: {
        resident_id,
        status: 'pending'
      },
      include: {
        requested_room: {
          select: {
            room_number: true
          }
        }
      }
    })

    if (existingRequest) {
      throw new ErrorWithStatus({
        message: `Đã có yêu cầu đổi phòng đang chờ xử lý cho resident này. Phòng yêu cầu: ${existingRequest.requested_room?.room_number || 'N/A'}. Vui lòng đợi staff xử lý yêu cầu hiện tại trước khi tạo yêu cầu mới.`,
        status: HTTP_STATUS.CONFLICT
      })
    }

    // Tạo request
    const request = await prisma.roomChangeRequest.create({
      data: {
        resident_id,
        institution_id: resident.institution_id,
        requested_by,
        requested_by_role: requested_by_role as any,
        current_room_id: resident.room_id,
        requested_room_id: requestData.requested_room_id,
        requested_room_type: requestData.requested_room_type as any,
        reason: requestData.reason,
        status: 'pending'
      },
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true
          }
        },
        current_room: {
          select: {
            room_id: true,
            room_number: true
          }
        },
        requested_room: {
          select: {
            room_id: true,
            room_number: true,
            type: true
          }
        }
      }
    })

    this.sendRoomChangeRequestNotification(request).catch((error) => {
      console.error('Failed to send room change request notification:', error)
    })

    return request
  }

  // Lấy danh sách room change requests cho family (chỉ lấy requests của residents mà family đã link)
  getRoomChangeRequestsForFamily = async (family_user_id: string) => {
    try {
      // Lấy danh sách residents mà family đã link (chỉ active links)
      const familyLinks = await prisma.familyResidentLink.findMany({
        where: {
          family_user_id,
          status: 'active'
        },
        select: {
          resident_id: true
        }
      })

      const residentIds = familyLinks.map((link) => link.resident_id)

      if (residentIds.length === 0) {
        return []
      }

      const requests = await prisma.roomChangeRequest.findMany({
        where: {
          resident_id: { in: residentIds }
        },
        include: {
          resident: {
            select: {
              resident_id: true,
              full_name: true,
              date_of_birth: true,
              gender: true
            }
          },
          current_room: {
            select: {
              room_id: true,
              room_number: true,
              type: true
            }
          },
          requested_room: {
            select: {
              room_id: true,
              room_number: true,
              type: true,
              capacity: true,
              current_occupancy: true
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
          created_at: 'desc'
        }
      })

      return requests
    } catch (error: any) {
      console.error('Error in getRoomChangeRequestsForFamily:', error)
      if (
        error.message?.includes('roomChangeRequest') ||
        error.message?.includes('RoomChangeRequest') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('Unknown model') ||
        error.code === 'P2021' ||
        error.code === 'P2001'
      ) {
        console.warn('RoomChangeRequest table may not exist yet. Returning empty array.')
        return []
      }
      throw new ErrorWithStatus({
        message: error.message || 'Failed to fetch room change requests',
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    }
  }

  // Lấy danh sách room change requests (cho staff)
  getRoomChangeRequests = async (institution_id: string, status?: string) => {
    try {
      const where: any = {
        institution_id
      }

      if (status && status !== 'all') {
        where.status = status
      }

      console.log('Fetching room change requests with where:', where)

      const requests = await prisma.roomChangeRequest.findMany({
        where,
        include: {
          resident: {
            select: {
              resident_id: true,
              full_name: true,
              date_of_birth: true,
              gender: true
            }
          },
          current_room: {
            select: {
              room_id: true,
              room_number: true,
              type: true
            }
          },
          requested_room: {
            select: {
              room_id: true,
              room_number: true,
              type: true,
              capacity: true,
              current_occupancy: true
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
              },
              familyProfile: {
                select: {
                  full_name: true
                }
              }
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      })

      return requests
    } catch (error: any) {
      console.error('Error in getRoomChangeRequests:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta
      })
      // Nếu lỗi do model chưa tồn tại hoặc table chưa được tạo, trả về mảng rỗng
      if (
        error.message?.includes('roomChangeRequest') ||
        error.message?.includes('RoomChangeRequest') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('Unknown model') ||
        error.code === 'P2021' || // Table does not exist
        error.code === 'P2001' // Record does not exist (but might be table issue)
      ) {
        console.warn('RoomChangeRequest table may not exist yet. Returning empty array.')
        return []
      }
      throw new ErrorWithStatus({
        message: error.message || 'Failed to fetch room change requests',
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    }
  }

  // Staff xác nhận room change request
  approveRoomChangeRequest = async (request_id: string, approved_by: string, notes?: string) => {
    const request = await prisma.roomChangeRequest.findUnique({
      where: { request_id },
      include: {
        resident: true,
        requested_room: true,
        current_room: true
      }
    })

    if (!request) {
      throw new ErrorWithStatus({
        message: 'Room change request not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (request.status !== 'pending') {
      throw new ErrorWithStatus({
        message: `Request is already ${request.status}`,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Kiểm tra phòng yêu cầu vẫn còn trống
    if (
      !request.requested_room.is_available ||
      request.requested_room.current_occupancy >= request.requested_room.capacity
    ) {
      throw new ErrorWithStatus({
        message: 'Requested room is no longer available',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Thực hiện đổi phòng trong transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update request status
      const updatedRequest = await tx.roomChangeRequest.update({
        where: { request_id },
        data: {
          status: 'approved',
          approved_by,
          approved_at: new Date(),
          notes
        }
      })

      // Cập nhật resident room_id
      await tx.resident.update({
        where: { resident_id: request.resident_id },
        data: { room_id: request.requested_room_id }
      })

      // Cập nhật occupancy của phòng cũ (nếu có)
      if (request.current_room_id) {
        const oldRoom = await tx.room.findUnique({
          where: { room_id: request.current_room_id }
        })
        if (oldRoom) {
          await tx.room.update({
            where: { room_id: request.current_room_id },
            data: {
              current_occupancy: Math.max(0, oldRoom.current_occupancy - 1),
              is_available: true
            }
          })
        }
      }

      // Cập nhật occupancy của phòng mới
      const newRoom = await tx.room.findUnique({
        where: { room_id: request.requested_room_id }
      })
      if (newRoom) {
        await tx.room.update({
          where: { room_id: request.requested_room_id },
          data: {
            current_occupancy: newRoom.current_occupancy + 1,
            is_available: newRoom.current_occupancy + 1 < newRoom.capacity
          }
        })
      }

      // Update request status to completed
      await tx.roomChangeRequest.update({
        where: { request_id },
        data: {
          status: 'completed',
          completed_at: new Date()
        }
      })

      return updatedRequest
    })

    return result
  }

  // Staff từ chối room change request
  rejectRoomChangeRequest = async (request_id: string, approved_by: string, notes?: string) => {
    const request = await prisma.roomChangeRequest.findUnique({
      where: { request_id }
    })

    if (!request) {
      throw new ErrorWithStatus({
        message: 'Room change request not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (request.status !== 'pending') {
      throw new ErrorWithStatus({
        message: `Request is already ${request.status}`,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const updatedRequest = await prisma.roomChangeRequest.update({
      where: { request_id },
      data: {
        status: 'rejected',
        approved_by,
        rejected_at: new Date(),
        notes
      }
    })

    return updatedRequest
  }

  // Gửi thông báo về room change request
  private async sendRoomChangeRequestNotification(request: any) {
    try {
      // Lấy thông tin resident và family links
      const resident = await prisma.resident.findUnique({
        where: { resident_id: request.resident_id },
        include: {
          familyResidentLinks: {
            where: {
              status: 'active'
            },
            include: {
              family_user: {
                select: {
                  email: true,
                  familyProfile: {
                    select: {
                      full_name: true
                    }
                  }
                }
              }
            }
          },
          institution: {
            include: {
              users: {
                where: {
                  role: { in: ['Staff', 'Admin', 'RootAdmin'] }
                },
                select: {
                  email: true
                }
              }
            }
          }
        }
      })

      if (!resident) return

      const recipientEmails: string[] = []

      // Thêm email của family members
      resident.familyResidentLinks.forEach((link) => {
        if (link.family_user?.email) {
          recipientEmails.push(link.family_user.email)
        }
      })

      // Thêm email của staff
      if (resident.institution?.users) {
        resident.institution.users.forEach((user) => {
          if (user.email) {
            recipientEmails.push(user.email)
          }
        })
      }

      // Gửi email thông báo
      if (recipientEmails.length > 0) {
        const roomTypeText =
          request.requested_room_type === 'single'
            ? 'Đơn'
            : request.requested_room_type === 'double'
              ? 'Đôi'
              : 'Nhiều giường'

        const currentRoomText = request.current_room?.room_number || 'Chưa có phòng'
        const requestedRoomText = request.requested_room?.room_number || 'N/A'

        const emailPromises = recipientEmails.map((email) =>
          transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Yêu cầu đổi phòng cho ${resident.full_name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #5985D8;">Yêu cầu đổi phòng mới</h2>
                <p><strong>Cư dân:</strong> ${resident.full_name}</p>
                <p><strong>Phòng hiện tại:</strong> ${currentRoomText}</p>
                <p><strong>Phòng yêu cầu:</strong> ${requestedRoomText} (${roomTypeText})</p>
                ${request.reason ? `<p><strong>Lý do:</strong> ${request.reason}</p>` : ''}
                <p style="color: #666; font-size: 12px; margin-top: 20px;">
                  Đây là thông báo tự động từ hệ thống HeLiCare.
                </p>
              </div>
            `
          })
        )

        await Promise.allSettled(emailPromises)
      }
    } catch (error) {
      console.error('Failed to send room change request notification:', error)
      // Không throw error để không ảnh hưởng đến việc tạo request
    }
  }
}

const roomService = new RoomService()

export { roomService, RoomService }
