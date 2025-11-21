import { PaymentMethod, PaymentStatus } from '@prisma/client'

export interface CreatePaymentParams {
  contract_id: string
  family_user_id: string
  institution_id: string
  method: PaymentMethod
  due_date: Date
  payment_items: {
    package_id: string
    contract_service_id?: string
    item_name: string
    quantity: number
    unit_price: number
    total_price: number
    period_start: Date
    period_end: Date
    notes?: string
  }[]
  notes?: string
}

export interface GetPaymentsParams {
  institution_id: string
  contract_id?: string
  family_user_id?: string
  status?: PaymentStatus
  method?: PaymentMethod
  take?: number
  skip?: number
}

export interface InitiatePayPalPaymentParams {
  payment_id: string
  return_url: string
  cancel_url: string
}

export interface UpdatePaymentStatusParams {
  payment_id: string
  status: PaymentStatus
  payment_reference?: string
  failure_reason?: string
  metadata?: any
  paid_at?: Date
}

export interface ProcessPayPalWebhookParams {
  event_type: string
  resource: any
}

export interface CreateBankTransferPaymentParams {
  payment_id: string
  bank_name: string
  account_number: string
  account_holder: string
  transfer_reference?: string
}

export interface CreateVisaPaymentParams {
  payment_id: string
  card_number: string
  card_holder: string
  expiry_date: string
  cvv: string
}

