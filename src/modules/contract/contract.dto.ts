import { ContractStatus, PaymentFrequency, ContractServiceStatus } from '@prisma/client'

export interface CreateContractParams {
  institution_id: string
  resident_id: string
  family_user_id?: string
  contract_number: string
  payment_frequency: PaymentFrequency
  total_amount: number
  start_date: Date
  end_date?: Date
  room_id?: string
  notes?: string
  service_packages: {
    package_id: string
    price_at_signing: number
    start_date: Date
    end_date?: Date
  }[]
}

export interface UpdateContractParams {
  contract_id: string
  updateData: {
    status?: ContractStatus
    payment_frequency?: PaymentFrequency
    total_amount?: number
    start_date?: Date
    end_date?: Date
    signed_date?: Date
    room_id?: string
    notes?: string
  }
}

export interface GetContractsParams {
  institution_id: string
  status?: ContractStatus
  resident_id?: string
  family_user_id?: string
  take?: number
  skip?: number
}

export interface AddServiceToContractParams {
  contract_id: string
  package_id: string
  price_at_signing: number
  start_date: Date
  end_date?: Date
}

export interface UpdateContractServiceParams {
  contract_service_id: string
  updateData: {
    status?: ContractServiceStatus
    end_date?: Date
    notes?: string
  }
}

export interface SignContractParams {
  contract_id: string
  signed_date: Date
  room_id?: string
}
