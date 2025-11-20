import { PaymentMethod, PaymentStatus } from '@prisma/client'

export interface CreatePaymentParams {
  contract_id: string
  family_user_id: string
  institution_id: string
  amount: number
  method: PaymentMethod
  due_date: Date
  notes?: string
  payment_items: {
    package_id: string
    contract_service_id?: string
    item_name: string
    quantity: number
    unit_price: number
    total_price: number
    period_start: Date
    period_end: Date
  }[]
}

export interface GeneratePaymentsFromContractParams {
  contract_id: string
  start_date?: Date
  end_date?: Date
}

export interface InitiatePayPalPaymentParams {
  payment_id: string
  return_url: string
  cancel_url: string
}

export interface CapturePayPalPaymentParams {
  payment_id: string
  order_id: string
}

export interface UpdatePaymentStatusParams {
  payment_id: string
  status: PaymentStatus
  payment_reference?: string
  failure_reason?: string
  metadata?: any
  paid_at?: Date
}

export interface GetPaymentsParams {
  contract_id?: string
  family_user_id?: string
  institution_id?: string
  status?: PaymentStatus
  method?: PaymentMethod
  take?: number
  skip?: number
}

export interface ProcessCODPaymentParams {
  payment_id: string
  notes?: string
}

export interface ProcessBankTransferParams {
  payment_id: string
  bank_name: string
  account_number: string
  transaction_reference: string
  notes?: string
}

export interface ProcessVisaPaymentParams {
  payment_id: string
  card_last_four: string
  transaction_id: string
  notes?: string
}

