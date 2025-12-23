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
  // Validate hash secret
  if (!VNPAY_CONFIG.hashSecret) {
    throw new Error('VNPay hash secret is not configured')
  }

  // Sắp xếp các tham số theo thứ tự alphabet và loại bỏ các giá trị null/undefined/empty
  // VNPay yêu cầu tính hash trên giá trị RAW (chưa encode URL) cho TẤT CẢ các trường
  // Theo tài liệu VNPay chính thức: hash được tính trên query string RAW, không encode
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc: Record<string, string>, key) => {
      const value = params[key]
      // Chỉ thêm các giá trị không rỗng (null, undefined, empty string)
      // Loại bỏ vnp_SecureHash khỏi quá trình tính toán
      if (key !== 'vnp_SecureHash' && value !== null && value !== undefined && value !== '') {
        // Giữ nguyên giá trị RAW (không encode) để tính hash
        acc[key] = String(value)
      }
      return acc
    }, {})

  // Tạo query string theo format VNPay: key1=value1&key2=value2
  // VNPay yêu cầu query string được tạo từ các giá trị đã encode (cho một số trường)
  const queryString = Object.keys(sortedParams)
    .map((key) => `${key}=${sortedParams[key]}`)
    .join('&')

  // Log để debug
  console.log('VNPay Hash Calculation:', {
    queryString,
    hashSecretLength: VNPAY_CONFIG.hashSecret.length,
    sortedParamsKeys: Object.keys(sortedParams),
    sortedParams
  })

  // Tạo hash SHA512
  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret)
  hmac.update(queryString, 'utf-8')
  const hash = hmac.digest('hex')
  
  console.log('VNPay Calculated Hash:', hash)
  
  return hash
}

/**
 * Verify secure hash từ VNPay callback
 * @param params - Object chứa các tham số từ VNPay
 * @param secureHash - Secure hash từ VNPay
 * @returns true nếu hash hợp lệ
 */
export const verifyVNPaySecureHash = (params: Record<string, any>, secureHash: string): boolean => {
  // Loại bỏ vnp_SecureHash khỏi params để tính toán
  const paramsToVerify = { ...params }
  delete paramsToVerify.vnp_SecureHash

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
  // Validate inputs
  if (!VNPAY_CONFIG.tmnCode || !VNPAY_CONFIG.hashSecret) {
    throw new Error('VNPay configuration is missing. Please check VNPAY_TMN_CODE and VNPAY_HASH_SECRET')
  }

  // Log config để kiểm tra (ẩn hashSecret vì bảo mật)
  console.log('VNPay Config Check:', {
    tmnCode: VNPAY_CONFIG.tmnCode,
    hashSecretLength: VNPAY_CONFIG.hashSecret.length,
    hashSecretFirstChars: VNPAY_CONFIG.hashSecret.substring(0, 4) + '...',
    returnUrl: returnUrl || VNPAY_CONFIG.returnUrl,
    url: VNPAY_CONFIG.url
  })

  // Validate TMN Code format (thường là 8 ký tự)
  if (VNPAY_CONFIG.tmnCode.length !== 8) {
    console.warn(`⚠️  WARNING: VNPay TMN Code should be 8 characters, got ${VNPAY_CONFIG.tmnCode.length} characters`)
  }

  // Validate Hash Secret format (thường là 32 ký tự)
  if (VNPAY_CONFIG.hashSecret.length !== 32) {
    console.warn(`⚠️  WARNING: VNPay Hash Secret should be 32 characters, got ${VNPAY_CONFIG.hashSecret.length} characters`)
  }

  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than 0')
  }

  if (!orderId || orderId.length > 100) {
    throw new Error('Order ID is required and must be less than 100 characters')
  }

  // Format date theo định dạng VNPay: YYYYMMDDHHmmss
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const createDate = `${year}${month}${day}${hours}${minutes}${seconds}`

  // Expire date: 15 phút sau
  const expireDateObj = new Date(date.getTime() + 15 * 60 * 1000)
  const expireYear = expireDateObj.getFullYear()
  const expireMonth = String(expireDateObj.getMonth() + 1).padStart(2, '0')
  const expireDay = String(expireDateObj.getDate()).padStart(2, '0')
  const expireHours = String(expireDateObj.getHours()).padStart(2, '0')
  const expireMinutes = String(expireDateObj.getMinutes()).padStart(2, '0')
  const expireSeconds = String(expireDateObj.getSeconds()).padStart(2, '0')
  const expireDate = `${expireYear}${expireMonth}${expireDay}${expireHours}${expireMinutes}${expireSeconds}`

  // Đảm bảo amount là số nguyên (VNPay yêu cầu số tiền nhân 100, không có dấu thập phân)
  const vnpAmount = Math.floor(amount * 100)

  // Rút ngắn orderId nếu quá dài (VNPay giới hạn 100 ký tự)
  const vnpTxnRef = orderId.length > 100 ? orderId.substring(0, 100) : orderId

  // Rút ngắn orderInfo nếu quá dài (VNPay giới hạn 255 ký tự)
  // Lưu ý: VNPay có thể yêu cầu orderInfo không có ký tự đặc biệt
  const vnpOrderInfo = orderInfo.length > 255 ? orderInfo.substring(0, 255) : orderInfo

  // Kiểm tra returnUrl - VNPay sandbox có thể không chấp nhận localhost
  const finalReturnUrl = returnUrl || VNPAY_CONFIG.returnUrl
  if (finalReturnUrl.includes('localhost') || finalReturnUrl.includes('127.0.0.1')) {
    console.warn('⚠️  WARNING: VNPay sandbox may not accept localhost in returnUrl. Consider using ngrok or a public URL.')
  }

  const params: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_CONFIG.tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: vnpTxnRef,
    vnp_OrderInfo: vnpOrderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: String(vnpAmount), // Phải là string
    vnp_ReturnUrl: finalReturnUrl,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate
  }

  // Log params trước khi tính hash để debug
  console.log('VNPay Params before hash:', JSON.stringify(params, null, 2))

  // Lưu ý: IPN URL thường được cấu hình trong merchant portal của VNPay
  // VNPay không yêu cầu IPN URL trong payment URL
  // IPN sẽ được gọi tự động đến URL đã cấu hình trong merchant portal

  // Tạo secure hash
  params.vnp_SecureHash = createVNPaySecureHash(params)

  // Log để debug
  console.log('VNPay Payment URL Params:', JSON.stringify(params, null, 2))

  // Tạo payment URL
  const paymentUrl = `${VNPAY_CONFIG.url}?${querystring.stringify(params)}`

  console.log('VNPay Payment URL:', paymentUrl)

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
