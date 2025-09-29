import { Request } from 'express'
import { AccessTokenPayload } from '~/modules/auth/auth.dto'
import { verifyToken } from '~/utils/jwt'
import { env } from './dot.env'

export const accessTokenDecode = async (token: string, req?: Request) => {
  const decoded_authorization = await verifyToken({
    token: token,
    secretOrPublicKey: env.JWT_SECRET_KEY_ACCESS_TOKEN as string
  })

  if (req) {
    req.decoded_authorization = decoded_authorization as AccessTokenPayload
    return decoded_authorization
  }
  return decoded_authorization
}
