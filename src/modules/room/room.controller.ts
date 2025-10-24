import { Request, Response } from 'express'
import { roomService } from './room.service'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  CreateRoomReqBody,
  UpdateRoomReqBody,
  AddResidentToRoomReqBody,
  RemoveResidentFromRoomReqBody
} from './room.dto'

class RoomController {
  // Tạo phòng mới
  createRoom = async (req: Request, res: Response) => {
    const { institution_id } = req.params
    const roomData: CreateRoomReqBody = req.body

    const room = await roomService.createRoom(institution_id, roomData)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Room created successfully',
      data: room
    })
  }

  // Lấy danh sách phòng của institution
  getRoomsByInstitution = async (req: Request, res: Response) => {
    const { institution_id } = req.params

    const rooms = await roomService.getRoomsByInstitution(institution_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get rooms successfully',
      data: rooms
    })
  }

  // Lấy thông tin phòng theo ID
  getRoomById = async (req: Request, res: Response) => {
    const { room_id } = req.params

    const room = await roomService.getRoomById(room_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get room successfully',
      data: room
    })
  }

  // Cập nhật thông tin phòng
  updateRoom = async (req: Request, res: Response) => {
    const { room_id } = req.params
    const updateData: UpdateRoomReqBody = req.body

    const updatedRoom = await roomService.updateRoom(room_id, updateData)

    res.status(HTTP_STATUS.OK).json({
      message: 'Room updated successfully',
      data: updatedRoom
    })
  }

  // Thêm resident vào phòng
  addResidentToRoom = async (req: Request, res: Response) => {
    const { room_id } = req.params
    const { resident_id }: AddResidentToRoomReqBody = req.body

    const result = await roomService.addResidentToRoom(room_id, resident_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Resident added to room successfully',
      data: result
    })
  }

  // Xóa resident khỏi phòng
  removeResidentFromRoom = async (req: Request, res: Response) => {
    const { room_id } = req.params
    const { resident_id }: RemoveResidentFromRoomReqBody = req.body

    const result = await roomService.removeResidentFromRoom(room_id, resident_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Resident removed from room successfully',
      data: result
    })
  }

  // Lấy danh sách resident trong phòng
  getResidentsInRoom = async (req: Request, res: Response) => {
    const { room_id } = req.params

    const residents = await roomService.getResidentsInRoom(room_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get residents in room successfully',
      data: residents
    })
  }

  // Xóa phòng
  deleteRoom = async (req: Request, res: Response) => {
    const { room_id } = req.params

    const deletedRoom = await roomService.deleteRoom(room_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Room deleted successfully',
      data: deletedRoom
    })
  }
}

const roomController = new RoomController()

export { roomController, RoomController }
