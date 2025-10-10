export interface CreateRoomDto {
  room_number: string
  type: 'single' | 'double' | 'multi'
  capacity: number
  is_available?: boolean
  notes?: string | null
}

export interface UpdateRoomDto {
  room_number?: string
  type?: 'single' | 'double' | 'multi'
  capacity?: number
  is_available?: boolean
  notes?: string | null
}


