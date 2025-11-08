import { ServiceType, RoomType } from '@prisma/client'

export interface CreateServicePackageParams {
  institution_id: string
  name: string
  description?: string
  type: ServiceType
  price_monthly: number
  price_annually?: number
  room_type?: RoomType
  includes_room: boolean
  features?: any
  max_residents?: number
}

export interface UpdateServicePackageParams {
  package_id: string
  updateData: {
    name?: string
    description?: string
    type?: ServiceType
    price_monthly?: number
    price_annually?: number
    room_type?: RoomType
    includes_room?: boolean
    features?: any
    max_residents?: number
    is_active?: boolean
  }
}

export interface GetServicePackagesParams {
  institution_id: string
  type?: ServiceType
  is_active?: boolean
  room_type?: RoomType
  take?: number
  skip?: number
}

export interface GetServicePackagesByTypeParams {
  institution_id: string
  type: ServiceType
  take?: number
  skip?: number
}
