import { $Enums } from '@prisma/client'
import { env } from './dot.env'

export const template = (token: string, token_type: $Enums.TokenType) => {
  const base = env.CLIENT_URL
  let title = ''
  let message = ''
  let path = ''
  const expireText = 'This link will expire in 1 hour.'

  switch (token_type) {
    case $Enums.TokenType.EmailVerifyToken:
      title = 'Xác thực email của bạn'
      message = 'Nhấn vào liên kết bên dưới để hoàn tất xác thực tài khoản.'
      path = 'verify-email'
      break

    case $Enums.TokenType.ForgotPasswordToken:
      title = 'Đặt lại mật khẩu của bạn'
      message = 'Nhấn vào liên kết bên dưới để đặt lại mật khẩu.'
      path = 'reset-password'
      break

    case $Enums.TokenType.StaffInviteToken:
    case $Enums.TokenType.AdminInviteToken:
      title = 'Lời mời tham gia hệ thống'
      message = 'Nhấn vào liên kết bên dưới để đặt lại mật khẩu và truy cập hệ thống.'
      path = 'invite'
      break

    case $Enums.TokenType.FamilyLinkToken:
      title = 'Xác nhận liên kết với người thân'
      message = 'Nhấn vào liên kết bên dưới để hoàn tất kết nối với người thân.'
      path = 'verify-family-link'
      break

    default:
      title = 'Xác nhận hành động'
      message = 'Nhấn vào liên kết bên dưới để tiếp tục.'
      path = 'verify'
  }

  const link = `${base}/${path}?token=${encodeURIComponent(token)}`

  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <p style="font-size:0.9em; color:#777;">Đây là email được gửi tự động, vui lòng không trả lời.</p>
      <h2>${title}</h2>
      <p>${message}</p>
      <a href="${link}" style="color:#1a73e8">${link}</a>
      <p style="font-size:0.9em; color:#777;">${expireText}</p>
    </div>
  `
}
