import { User } from '@prisma/client'
import { AccessTokenPayload, RefreshTokenPayload } from '~/modules/auth/auth.dto'
declare module 'express' {
  interface Request {
    user?: User
    decoded_authorization?: AccessTokenPayload
    decoded_refresh_token?: RefreshTokenPayload
  }
}
