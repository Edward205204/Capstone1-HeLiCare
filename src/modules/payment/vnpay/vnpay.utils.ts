import crypto from 'crypto'
import querystring from 'querystring'
import { env } from '~/utils/dot.env'

/**
 * VNPay Utilities
 * Xử lý các hàm tiện ích cho VNPay integration
 */

// VNPay Configuration từ environment variables
export const VNPAY_CONFIG = {
  tmnCode: env.VNPAY_TMN_CODE || '',
  hashSecret: env.VNPAY_HASH_SECRET || '',
  url: env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl: env.VNPAY_RETURN_URL || 'http://localhost:3000/api/payments/vnpay/callback',
  ipnUrl: env.VNPAY_IPN_URL || 'http://localhost:3000/api/payments/vnpay/ipn'
}

/**
 * Tạo secure hash cho VNPay request
 * @param params - Object chứa các tham số
 * @returns Secure hash string
 */
export const createVNPaySecureHash = (params: Record<string, any>): string => {
  // Sắp xếp các tham số theo thứ tự alphabet
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc: Record<string, any>, key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        acc[key] = params[key]
      }
      return acc
    }, {})

  // Tạo query string
  const queryString = querystring.stringify(sortedParams)

  // Tạo hash SHA512
  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret)
  hmac.update(queryString, 'utf-8')
  return hmac.digest('hex')
}

/**
 * Verify secure hash từ VNPay callback
 * @param params - Object chứa các tham số từ VNPay
 * @param secureHash - Secure hash từ VNPay
 * @returns true nếu hash hợp lệ
 */
export const verifyVNPaySecureHash = (params: Record<string, any>, secureHash: string): boolean => {
  // Loại bỏ vnp_SecureHash khỏi params để tính toán
  const { vnp_SecureHash, ...paramsToVerify } = params

  // Tạo hash từ params
  const calculatedHash = createVNPaySecureHash(paramsToVerify)

  // So sánh hash
  return calculatedHash === secureHash
}

/**
 * Tạo payment URL cho VNPay
 * @param orderInfo - Thông tin đơn hàng
 * @param amount - Số tiền (VND)
 * @param orderId - Mã đơn hàng (unique)
 * @param returnUrl - URL redirect sau khi thanh toán
 * @param ipnUrl - URL nhận IPN từ VNPay
 * @returns Payment URL
 */
export const createVNPayPaymentUrl = (
  orderInfo: string,
  amount: number,
  orderId: string,
  returnUrl?: string,
  ipnUrl?: string
): string => {
  const date = new Date()
  const createDate = date.toISOString().replace(/[-:]/g, '').split('.')[0] + '00'
  const expireDate =
    new Date(date.getTime() + 15 * 60 * 1000) // 15 phút
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0] + '00'

  const params: Record<string, any> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_CONFIG.tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: amount * 100, // VNPay yêu cầu số tiền nhân 100
    vnp_ReturnUrl: returnUrl || VNPAY_CONFIG.returnUrl,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate
  }

  // Thêm IPN URL nếu có
  if (ipnUrl || VNPAY_CONFIG.ipnUrl) {
    params.vnp_IpAddr = ipnUrl || VNPAY_CONFIG.ipnUrl
  } else {
    // Default IP address cho sandbox
    params.vnp_IpAddr = '127.0.0.1'
  }

  // Tạo secure hash
  params.vnp_SecureHash = createVNPaySecureHash(params)

  // Tạo payment URL
  const paymentUrl = `${VNPAY_CONFIG.url}?${querystring.stringify(params)}`

  return paymentUrl
}

/**
 * Parse VNPay callback params
 * @param query - Query params từ VNPay callback
 * @returns Parsed params object
 */
export const parseVNPayCallback = (query: Record<string, any>) => {
  return {
    amount: parseInt(query.vnp_Amount) / 100, // Chia 100 để lấy số tiền thực tế
    bankCode: query.vnp_BankCode,
    bankTranNo: query.vnp_BankTranNo,
    cardType: query.vnp_CardType,
    orderInfo: query.vnp_OrderInfo,
    payDate: query.vnp_PayDate,
    responseCode: query.vnp_ResponseCode,
    tmnCode: query.vnp_TmnCode,
    transactionNo: query.vnp_TransactionNo,
    transactionStatus: query.vnp_TransactionStatus,
    txnRef: query.vnp_TxnRef,
    secureHash: query.vnp_SecureHash
  }
}

/**
 * Kiểm tra response code từ VNPay
 * @param responseCode - Mã phản hồi từ VNPay
 * @returns true nếu thanh toán thành công
 */
export const isVNPaySuccess = (responseCode: string): boolean => {
  return responseCode === '00'
}

/**
 * Lấy thông điệp từ response code
 * @param responseCode - Mã phản hồi từ VNPay
 * @returns Thông điệp tương ứng
 */
export const getVNPayResponseMessage = (responseCode: string): string => {
  const messages: Record<string, string> = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
    '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
    '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch.',
    '12': 'Thẻ/Tài khoản bị khóa.',
    '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP). Xin vui lòng thực hiện lại giao dịch.',
    '51': 'Tài khoản không đủ số dư để thực hiện giao dịch.',
    '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định. Xin vui lòng thực hiện lại giao dịch.',
    '99': 'Lỗi không xác định'
  }

  return messages[responseCode] || `Lỗi không xác định (Mã: ${responseCode})`
}
