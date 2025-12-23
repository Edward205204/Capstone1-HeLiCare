import { UserRole, UserStatus } from '@prisma/client'
import { JwtPayload } from 'jsonwebtoken'
import { TokenType } from '~/constants/token_type'

// tạm thời - cần chỉnh sửa
export interface TokenPayload extends JwtPayload {
  user_id: string
  institution_id: string | null
  status: UserStatus
  role: UserRole
  email?: string
}

export interface AccessTokenPayload extends TokenPayload {
  token_type: TokenType.AccessToken
}

export interface RefreshTokenPayload extends TokenPayload {
  token_type: TokenType.RefreshToken
}

export interface EmailVerifyTokenReqBody extends TokenPayload {
  token_type: TokenType.EmailVerifyToken
}

export interface StaffInviteTokenReqBody extends TokenPayload {
  token_type: TokenType.StaffInviteToken
}

export interface AdminInviteTokenReqBody extends TokenPayload {
  token_type: TokenType.AdminInviteToken
}

export interface ForgotPasswordTokenPayload {
  email: string
  token_type: TokenType.ForgotPasswordToken
}

export interface FamilyLinkTokenPayload extends TokenPayload {
  token_type: TokenType.FamilyLinkToken
  resident_id: string
  institution_id: string
}

export interface RegisterDto {
  email: string
  full_name: string
  password: string
  confirm_password: string
  role: UserRole
}

export interface CreateFamilyAccountDto {
  email: string
  full_name: string
}
