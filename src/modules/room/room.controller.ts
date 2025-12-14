import { Request, Response } from 'express'
import { roomService } from './room.service'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  CreateRoomReqBody,
  UpdateRoomReqBody,
  AddResidentToRoomReqBody,
  RemoveResidentFromRoomReqBody,
  CreateRoomChangeRequestReqBody,
  ApproveRoomChangeRequestReqBody
} from './room.dto'

class RoomController {
  // Tạo phòng mới
  createRoom = async (req: Request, res: Response): Promise<void> => {
    const institution_id = req.user?.institution_id // Lấy từ token
    if (!institution_id) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Institution ID not found in user profile'
      })
      return
    }
    const roomData: CreateRoomReqBody = req.body

    const room = await roomService.createRoom(institution_id, roomData)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Room created successfully',
      data: room
    })
  }

  // Lấy danh sách phòng của institution (từ token)
  getRoomsByInstitution = async (req: Request, res: Response): Promise<void> => {
    const institution_id = req.user?.institution_id // Lấy từ token
    if (!institution_id) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Institution ID not found in user profile'
      })
      return
    }

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

  // Lấy danh sách phòng trống theo type
  getAvailableRoomsByType = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { room_type } = req.query

    if (!institution_id) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Institution ID not found'
      })
      return
    }

    if (!room_type) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Room type is required'
      })
      return
    }

    const rooms = await roomService.getAvailableRoomsByType(institution_id, room_type as string)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get available rooms successfully',
      data: rooms
    })
  }

  // Tạo yêu cầu đổi phòng
  createRoomChangeRequest = async (req: Request, res: Response) => {
    try {
      const requested_by = req.decoded_authorization?.user_id as string
      const requested_by_role = req.decoded_authorization?.role as string
      const requestData: CreateRoomChangeRequestReqBody = req.body

      if (!requested_by) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          message: 'User ID not found'
        })
        return
      }

      const request = await roomService.createRoomChangeRequest(
        requestData.resident_id,
        requested_by,
        requested_by_role,
        {
          requested_room_id: requestData.requested_room_id,
          requested_room_type: requestData.requested_room_type,
          reason: requestData.reason
        }
      )

      res.status(HTTP_STATUS.CREATED).json({
        message: 'Room change request created successfully',
        data: request
      })
    } catch (error: any) {
      console.error('Error in createRoomChangeRequest controller:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to create room change request'
      })
    }
  }

  // Lấy danh sách room change requests cho family
  getRoomChangeRequestsForFamily = async (req: Request, res: Response) => {
    try {
      const family_user_id = req.decoded_authorization?.user_id as string

      if (!family_user_id) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          message: 'User ID not found'
        })
        return
      }

      const requests = await roomService.getRoomChangeRequestsForFamily(family_user_id)

      res.status(HTTP_STATUS.OK).json({
        message: 'Get room change requests successfully',
        data: requests
      })
    } catch (error: any) {
      console.error('Error in getRoomChangeRequestsForFamily controller:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to fetch room change requests'
      })
    }
  }

  // Lấy danh sách room change requests (cho staff)
  getRoomChangeRequests = async (req: Request, res: Response) => {
    try {
      const institution_id = req.decoded_authorization?.institution_id as string
      const { status } = req.query

      if (!institution_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'Institution ID not found'
        })
        return
      }

      const requests = await roomService.getRoomChangeRequests(institution_id, status as string | undefined)

      res.status(HTTP_STATUS.OK).json({
        message: 'Get room change requests successfully',
        data: requests
      })
    } catch (error: any) {
      console.error('Error in getRoomChangeRequests controller:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to fetch room change requests'
      })
    }
  }

  // Staff xác nhận room change request
  approveRoomChangeRequest = async (req: Request, res: Response) => {
    const { request_id } = req.params
    const approved_by = req.decoded_authorization?.user_id as string
    const { notes }: ApproveRoomChangeRequestReqBody = req.body

    if (!approved_by) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'User ID not found'
      })
      return
    }

    const request = await roomService.approveRoomChangeRequest(request_id, approved_by, notes)

    res.status(HTTP_STATUS.OK).json({
      message: 'Room change request approved successfully',
      data: request
    })
  }

  // Staff từ chối room change request
  rejectRoomChangeRequest = async (req: Request, res: Response) => {
    const { request_id } = req.params
    const approved_by = req.decoded_authorization?.user_id as string
    const { notes }: ApproveRoomChangeRequestReqBody = req.body

    if (!approved_by) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'User ID not found'
      })
      return
    }

    const request = await roomService.rejectRoomChangeRequest(request_id, approved_by, notes)

    res.status(HTTP_STATUS.OK).json({
      message: 'Room change request rejected successfully',
      data: request
    })
  }
}

const roomController = new RoomController()

export { roomController, RoomController }
