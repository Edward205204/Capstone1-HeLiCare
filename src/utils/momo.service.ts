import crypto from 'crypto'
import { env } from './dot.env'

export interface MomoPaymentRequest {
  partnerCode: string
  partnerName: string
  storeId: string
  requestId: string
  amount: number
  orderId: string
  orderInfo: string
  redirectUrl: string
  ipnUrl: string
  requestType: string
  extraData: string
  lang?: string
}

export interface MomoPaymentResponse {
  partnerCode: string
  orderId: string
  requestId: string
  amount: number
  responseTime: number
  message: string
  resultCode: number
  payUrl?: string
  deeplink?: string
  qrCodeUrl?: string
  deeplinkWebInApp?: string
}

export interface MomoCallbackData {
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

class MomoService {
  private partnerCode: string
  private accessKey: string
  private secretKey: string
  private apiEndpoint: string
  private redirectUrl: string
  private ipnUrl: string

  constructor() {
    // Get Momo credentials from environment variables
    this.partnerCode = env.MOMO_PARTNER_CODE || ''
    this.accessKey = env.MOMO_ACCESS_KEY || ''
    this.secretKey = env.MOMO_SECRET_KEY || ''
    // Use sandbox for testing, production URL: https://payment.momo.vn/v2/gateway/api/create
    this.apiEndpoint = env.MOMO_API_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create'
    this.redirectUrl = env.MOMO_REDIRECT_URL || 'http://localhost:3000/payment/momo/return'
    this.ipnUrl = env.MOMO_IPN_URL || 'http://localhost:3000/api/payments/momo/callback'
  }

  /**
   * Create payment request to Momo
   */
  async createPayment(request: {
    orderId: string
    amount: number
    orderInfo: string
    requestId?: string
    extraData?: string
    redirectUrl?: string
    ipnUrl?: string
  }): Promise<MomoPaymentResponse> {
    const requestId = request.requestId || `REQ${Date.now()}`
    const orderId = request.orderId
    const amount = request.amount
    const orderInfo = request.orderInfo
    const redirectUrl = request.redirectUrl || this.redirectUrl
    const ipnUrl = request.ipnUrl || this.ipnUrl
    const extraData = request.extraData || ''

    // Create raw signature
    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`

    // Create HMAC SHA256 signature
    const signature = crypto.createHmac('sha256', this.secretKey).update(rawSignature).digest('hex')

    // Create payment request
    const paymentRequest: MomoPaymentRequest = {
      partnerCode: this.partnerCode,
      partnerName: 'HeliCare',
      storeId: this.partnerCode,
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      requestType: 'captureWallet',
      extraData: extraData,
      lang: 'vi'
    }

    // Send request to Momo
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...paymentRequest,
          signature: signature
        })
      })

      const data = await response.json()

      if (data.resultCode !== 0) {
        throw new Error(`Momo payment error: ${data.message}`)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to create Momo payment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify Momo callback signature
   */
  verifyCallbackSignature(callbackData: MomoCallbackData): boolean {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature
    } = callbackData

    // Create raw signature
    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`

    // Create HMAC SHA256 signature
    const calculatedSignature = crypto.createHmac('sha256', this.secretKey).update(rawSignature).digest('hex')

    return calculatedSignature === signature
  }

  /**
   * Query payment status from Momo
   */
  async queryPaymentStatus(orderId: string, requestId: string): Promise<any> {
    const rawSignature = `accessKey=${this.accessKey}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${requestId}`
    const signature = crypto.createHmac('sha256', this.secretKey).update(rawSignature).digest('hex')

    const queryUrl = env.MOMO_QUERY_URL || 'https://test-payment.momo.vn/v2/gateway/api/query'

    try {
      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partnerCode: this.partnerCode,
          requestId: requestId,
          orderId: orderId,
          signature: signature,
          lang: 'vi'
        })
      })

      const data = await response.json()
      return data
    } catch (error) {
      throw new Error(`Failed to query Momo payment status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const momoService = new MomoService()

