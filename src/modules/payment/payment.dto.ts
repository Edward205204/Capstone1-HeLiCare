import { PaymentMethod, PaymentStatus } from '@prisma/client'

// Create Payment DTO
export interface CreatePaymentReqBody {
  contract_id: string
  payment_method: PaymentMethod
  amount: number
  period_start: string // ISO date string
  period_end: string // ISO date string
  notes?: string
}

// Update Payment DTO (for Admin verification)
export interface UpdatePaymentReqBody {
  status?: PaymentStatus
  transaction_ref?: string
  notes?: string
}

// Upload Proof Image DTO
export interface UploadProofReqBody {
  proof_image_url: string
  transaction_ref?: string
  notes?: string
}

// Payment Response DTO
export interface PaymentResponse {
  payment_id: string
  contract_id: string
  payer_id: string | null
  amount: number
  payment_method: PaymentMethod
  status: PaymentStatus
  transaction_ref: string | null
  proof_image_url: string | null
  vnpay_transaction_no: string | null
  vnpay_order_id: string | null
  vnpay_response_code: string | null
  vnpay_bank_code: string | null
  notes: string | null
  verified_by_id: string | null
  verified_at: string | null
  period_start: string
  period_end: string
  created_at: string
  updated_at: string
  // Relations
  contract?: {
    contract_id: string
    resident_id: string
    amount: number
    billing_cycle: string
    next_billing_date: string
    resident?: {
      resident_id: string
      full_name: string
    }
    institution?: {
      institution_id: string
      name: string
    }
  }
  payer?: {
    user_id: string
    email: string
    familyProfile?: {
      full_name: string
    }
  }
  verified_by?: {
    user_id: string
    email: string
    staffProfile?: {
      full_name: string
    }
  }
}

// Get Payments Query
export interface GetPaymentsQuery {
  contract_id?: string
  payer_id?: string
  status?: PaymentStatus
  payment_method?: PaymentMethod
  start_date?: string // ISO date string
  end_date?: string // ISO date string
  page?: number
  limit?: number
}

// Payment List Response
export interface PaymentListResponse {
  payments: PaymentResponse[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// VNPay Create Payment DTO
export interface CreateVNPayPaymentReqBody {
  contract_id: string
  period_start: string
  period_end: string
}

// VNPay Payment URL Response
export interface VNPayPaymentUrlResponse {
  payment_url: string
  payment_id: string
  order_id: string
}

// VNPay Callback Query Params
export interface VNPayCallbackQuery {
  vnp_Amount: string
  vnp_BankCode: string
  vnp_BankTranNo: string
  vnp_CardType: string
  vnp_OrderInfo: string
  vnp_PayDate: string
  vnp_ResponseCode: string
  vnp_TmnCode: string
  vnp_TransactionNo: string
  vnp_TransactionStatus: string
  vnp_TxnRef: string
  vnp_SecureHash: string
}
