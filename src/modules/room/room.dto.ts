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

export interface CreateRoomChangeRequestReqBody {
  resident_id: string
  requested_room_id: string
  requested_room_type: RoomType
  reason?: string
}

export interface ApproveRoomChangeRequestReqBody {
  request_id: string
  notes?: string
}
