import { prisma } from '~/utils/db'
import { CreateRoomDto, UpdateRoomDto } from './room.dto'
import { HTTP_STATUS } from '~/constants/http_status'
import { ErrorWithStatus } from '~/models/error'

export class RoomService {
  async createRoom(institution_id: string, payload: CreateRoomDto) {
    const exists = await prisma.room.findFirst({ where: { institution_id, room_number: payload.room_number } })
    if (exists) {
      throw new ErrorWithStatus({ message: 'Room number already exists', status: HTTP_STATUS.CONFLICT })
    }
    const room = await prisma.room.create({
      data: {
        institution_id,
        room_number: payload.room_number,
        type: payload.type as any,
        capacity: payload.capacity,
        is_available: payload.is_available ?? true,
        current_occupancy: 0,
        notes: payload.notes ?? null
      }
    })
    return room
  }

  async updateRoom(institution_id: string, room_id: string, payload: UpdateRoomDto) {
    const room = await prisma.room.findFirst({ where: { room_id, institution_id } })
    if (!room) {
      throw new ErrorWithStatus({ message: 'Room not found', status: HTTP_STATUS.NOT_FOUND })
    }
    if (payload.capacity !== undefined && payload.capacity < room.current_occupancy) {
      throw new ErrorWithStatus({ message: 'Capacity cannot be less than current occupancy', status: HTTP_STATUS.BAD_REQUEST })
    }
    const updated = await prisma.room.update({ where: { room_id }, data: { ...payload } as any })
    return updated
  }

  async addResidentToRoom(institution_id: string, room_id: string, resident_id: string) {
    const room = await prisma.room.findFirst({ where: { room_id, institution_id } })
    if (!room) {
      throw new ErrorWithStatus({ message: 'Room not found', status: HTTP_STATUS.NOT_FOUND })
    }
    if (room.current_occupancy >= room.capacity) {
      throw new ErrorWithStatus({ message: 'Room is full', status: HTTP_STATUS.BAD_REQUEST })
    }
    const resident = await prisma.resident.findFirst({ where: { resident_id, institution_id } })
    if (!resident) {
      throw new ErrorWithStatus({ message: 'Resident not found', status: HTTP_STATUS.NOT_FOUND })
    }
    if (resident.room_id && resident.room_id !== room_id) {
      // decrement old room occupancy
      await prisma.room.update({
        where: { room_id: resident.room_id },
        data: { current_occupancy: { decrement: 1 } }
      })
    }
    const result = await prisma.$transaction([
      prisma.resident.update({ where: { resident_id }, data: { room_id: room_id } }),
      prisma.room.update({ where: { room_id }, data: { current_occupancy: { increment: 1 } } })
    ])
    return result[0]
  }

  async listResidentsInRoom(institution_id: string, room_id: string) {
    const room = await prisma.room.findFirst({ where: { room_id, institution_id } })
    if (!room) {
      throw new ErrorWithStatus({ message: 'Room not found', status: HTTP_STATUS.NOT_FOUND })
    }
    const residents = await prisma.resident.findMany({ where: { room_id, institution_id } })
    return residents
  }

  async deleteRoom(institution_id: string, room_id: string) {
    const room = await prisma.room.findFirst({ where: { room_id, institution_id }, include: { residents: true } })
    if (!room) {
      throw new ErrorWithStatus({ message: 'Room not found', status: HTTP_STATUS.NOT_FOUND })
    }
    if (room.residents.length > 0) {
      throw new ErrorWithStatus({ message: 'Cannot delete a room with residents', status: HTTP_STATUS.BAD_REQUEST })
    }
    await prisma.room.delete({ where: { room_id } })
    return true
  }
}

export const roomService = new RoomService()


