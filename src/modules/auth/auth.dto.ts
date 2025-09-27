import { StaffPosition, UserRole, UserStatus } from '@prisma/client'
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

export interface EmailVerifyTokenReqBody extends TokenPayload {
  token_type: TokenType.EmailVerifyToken
}

export interface StaffInviteTokenReqBody extends TokenPayload {
  token_type: TokenType.StaffInviteToken
}

export interface RootAdminInviteTokenReqBody extends TokenPayload {
  token_type: TokenType.RootAdminInviteToken
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

export interface CreateStaffForInstitutionDto {
  email: string
  full_name: string
  phone: string
  hire_date: string
  notes: string
  institution_id: string
  position: StaffPosition
}
