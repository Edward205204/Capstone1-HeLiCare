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
  refresh_token: string
}

export interface EmailVerifyTokenPayload extends TokenPayload {
  token_type: TokenType.EmailVerifyToken
}

export interface RegisterDto {
  email: string
  password: string
  confirm_password: string
}
