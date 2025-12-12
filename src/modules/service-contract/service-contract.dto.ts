// Create Service Contract DTO
export interface CreateServiceContractReqBody {
  resident_id: string
  billing_cycle: 'MONTHLY' | 'YEARLY'
  amount: number
  start_date?: string // ISO date string, optional (default: now)
  next_billing_date: string // ISO date string
}

// Update Service Contract DTO
export interface UpdateServiceContractReqBody {
  billing_cycle?: 'MONTHLY' | 'YEARLY'
  amount?: number
  next_billing_date?: string // ISO date string
  is_active?: boolean
}

// Service Contract Response DTO
export interface ServiceContractResponse {
  contract_id: string
  resident_id: string
  institution_id: string
  billing_cycle: 'MONTHLY' | 'YEARLY'
  amount: number
  start_date: string
  next_billing_date: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  resident?: {
    resident_id: string
    full_name: string
    room?: {
      room_id: string
      room_number: string
    } | null
  }
  institution?: {
    institution_id: string
    name: string
  }
  payments?: Array<{
    payment_id: string
    amount: number
    status: string
    payment_method: string
    created_at: string
  }>
}

// Get Service Contracts Query
export interface GetServiceContractsQuery {
  resident_id?: string
  institution_id?: string
  is_active?: boolean
  page?: number
  limit?: number
}

// Service Contract List Response
export interface ServiceContractListResponse {
  contracts: ServiceContractResponse[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
