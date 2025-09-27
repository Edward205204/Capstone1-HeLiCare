import { User } from '@prisma/client'
import { AccessTokenPayload, RefreshTokenPayload, StaffInviteTokenReqBody, TokenPayload } from '~/modules/auth/auth.dto'
import { TokenType } from '~/constants/token_type'
declare module 'express' {
  interface Request {
    user?: User
    decoded_authorization?: AccessTokenPayload
    decoded_refresh_token?: RefreshTokenPayload
    decoded_email_verify_token?: TokenPayload & { token_type: TokenType.EmailVerifyToken }
    decoded_admin_invite_token?: TokenPayload & { token_type: TokenType.AdminInviteToken }
    decoded_root_admin_invite_token?: TokenPayload & { token_type: TokenType.AdminInviteToken }
    decoded_staff_invite_token?: StaffInviteTokenReqBody
  }
}
