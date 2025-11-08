import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { CreateRoomReqBody, UpdateRoomReqBody } from './room.dto'

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
  getRoomsByInstitution = async (institution_id: string) => {
    const rooms = await prisma.room.findMany({
      where: { institution_id },
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
      },
      orderBy: {
        room_number: 'asc'
      }
    })

    return rooms
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
            cognitive_status: true,
            mobility_status: true,
            chronic_diseases: true,
            allergies: true,
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
}

const roomService = new RoomService()

export { roomService, RoomService }
