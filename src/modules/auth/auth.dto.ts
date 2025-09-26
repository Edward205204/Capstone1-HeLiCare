import { UserRole, UserStatus } from '@prisma/client'
import { JwtPayload } from 'jsonwebtoken'
import { TokenType } from '~/constants/token_type'

// tạm thời - cần chỉnh sửa
export interface TokenPayload extends JwtPayload {
  user_id: string
  institution_id: string | null
  status: UserStatus
  role: UserRole
}

export interface AccessTokenPayload extends TokenPayload {
  token_type: TokenType.AccessToken
}

export interface RefreshTokenPayload extends TokenPayload {
  token_type: TokenType.RefreshToken
}

export interface RefreshTokenReqBody {
  refresh_token: TokenType
}

export interface EmailVerifyTokenPayload {
  email: string
  token_type: TokenType.EmailVerifyToken
}

export interface EmailVerifyTokenReqBody extends TokenPayload {
  token_type: TokenType.EmailVerifyToken
}

export interface ForgotPasswordTokenPayload {
  email: string
  token_type: TokenType.ForgotPasswordToken
}

export interface RegisterDto {
  email: string
  password: string
  confirm_password: string
  role: UserRole
}
