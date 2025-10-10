import { Request, Response } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { RoomService, roomService as roomServiceInstance } from './room.service'

class RoomController {
  constructor(private readonly roomService: RoomService = roomServiceInstance) {}

  createRoom = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.roomService.createRoom(institution_id, req.body)
    res.status(HTTP_STATUS.OK).json({ message: 'Room created successfully', data })
  }

  updateRoom = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { room_id } = req.params
    const data = await this.roomService.updateRoom(institution_id, room_id, req.body)
    res.status(HTTP_STATUS.OK).json({ message: 'Room updated successfully', data })
  }

  addResidentToRoom = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { room_id } = req.params
    const { resident_id } = req.body as { resident_id: string }
    const data = await this.roomService.addResidentToRoom(institution_id, room_id, resident_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Resident added to room successfully', data })
  }

  listResidentsInRoom = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { room_id } = req.params
    const data = await this.roomService.listResidentsInRoom(institution_id, room_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Residents fetched successfully', data })
  }

  deleteRoom = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { room_id } = req.params
    await this.roomService.deleteRoom(institution_id, room_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Room deleted successfully' })
  }
}

const roomController = new RoomController()

export { roomController, RoomController }


