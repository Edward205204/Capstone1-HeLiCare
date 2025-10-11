import { RoomType } from '@prisma/client'

export interface CreateRoomReqBody {
  room_number: string
  type: RoomType
  capacity: number
  notes?: string
}

export interface UpdateRoomReqBody {
  room_number?: string
  type?: RoomType
  capacity?: number
  notes?: string
}

export interface AddResidentToRoomReqBody {
  resident_id: string
}

export interface RemoveResidentFromRoomReqBody {
  resident_id: string
}
