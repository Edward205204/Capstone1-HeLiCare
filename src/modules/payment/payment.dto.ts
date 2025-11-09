import { PaymentMethod, PaymentStatus, PaymentTransactionStatus } from '@prisma/client'

export interface CreatePaymentReqBody {
  contract_id: string
  payment_method: PaymentMethod
  payment_period_start: string // ISO date string
  payment_period_end: string // ISO date string
  notes?: string
}

export interface InitiateMomoPaymentReqBody {
  payment_id: string
  return_url?: string
  notify_url?: string
}

export interface MomoPaymentCallbackQuery {
  partnerCode: string
  orderId: string
  requestId: string
  amount: number
  orderInfo: string
  orderType: string
  transId: string
  resultCode: number
  message: string
  payType: string
  responseTime: number
  extraData: string
  signature: string
}

export interface GetPaymentsReqQuery {
  contract_id?: string
  status?: PaymentStatus
  payment_method?: PaymentMethod
  start_date?: string
  end_date?: string
  take?: number
  skip?: number
}

export interface UpdatePaymentStatusReqBody {
  status: PaymentStatus
  notes?: string
  paid_date?: string
}

export interface ConfirmCODPaymentReqBody {
  payment_id: string
  confirmation_code?: string
  notes?: string
}

export interface CreatePaymentResponse {
  payment_id: string
  contract_id: string
  amount: number
  payment_method: PaymentMethod
  status: PaymentStatus
  due_date: Date
  payment_period_start: Date
  payment_period_end: Date
  created_at: Date
}

export interface MomoPaymentUrlResponse {
  payment_url: string
  transaction_id: string
  payment_id: string
}

export interface PaymentWithDetails {
  payment_id: string
  contract_id: string
  family_user_id: string
  institution_id: string
  amount: number
  payment_method: PaymentMethod
  status: PaymentStatus
  due_date: Date
  paid_date?: Date
  payment_period_start: Date
  payment_period_end: Date
  notes?: string
  created_at: Date
  updated_at: Date
  contract: {
    contract_id: string
    contract_number: string
    resident: {
      resident_id: string
      full_name: string
    }
  }
  transactions: {
    transaction_id: string
    transaction_code?: string
    status: PaymentTransactionStatus
    gateway_transaction_id?: string
    created_at: Date
  }[]
}

