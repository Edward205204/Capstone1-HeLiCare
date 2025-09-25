import { UserRole, UserStatus } from '@prisma/client'
import { TokenType } from '~/constants/token_type'
import {
  AccessTokenPayload,
  EmailVerifyTokenPayload,
  RefreshTokenPayload,
  RegisterDto,
  TokenPayload
} from '~/modules/auth/auth.dto'
import { prisma } from '~/utils/db'
import { hashPassword } from '~/utils/hash'
import { signToken, verifyToken } from '~/utils/jwt'

class AuthService {
  constructor() {}

  private async sightAccessTokenAndRefreshToken(payload: TokenPayload): Promise<string[]> {
    const [access_token, refresh_token] = await Promise.all([
      this.accessToken({ ...payload, token_type: TokenType.AccessToken }),
      this.refreshToken({ ...payload, token_type: TokenType.RefreshToken })
    ])
    return [access_token, refresh_token]
  }
  private async accessToken(payload: AccessTokenPayload): Promise<string> {
    return await signToken({
      secretOrPrivateKey: process.env.JWT_SECRET_KEY_ACCESS_TOKEN as string,
      payload: { ...payload },
      option: { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION_TIME }
    })
  }

  private async refreshToken(payload: RefreshTokenPayload): Promise<string> {
    if (payload.exp) {
      return await signToken({
        secretOrPrivateKey: process.env.JWT_SECRET_KEY_REFRESH_TOKEN as string,
        payload: { ...payload }
      })
    }
    return await signToken({
      secretOrPrivateKey: process.env.JWT_SECRET_KEY_REFRESH_TOKEN as string,
      payload: { ...payload },
      option: { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION_TIME }
    })
  }

  private async emailVerifyToken(payload: EmailVerifyTokenPayload): Promise<string> {
    if (payload.exp) {
      return await signToken({
        secretOrPrivateKey: process.env.JWT_SECRET_KEY_EMAIL_VERIFY_TOKEN as string,
        payload: { ...payload }
      })
    }
    return await signToken({
      secretOrPrivateKey: process.env.JWT_SECRET_KEY_EMAIL_VERIFY_TOKEN as string,
      payload: { ...payload },
      option: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRATION_TIME }
    })
  }

  private async decodeRefreshToken(refresh_token: string) {
    return verifyToken({
      token: refresh_token,
      secretOrPublicKey: process.env.JWT_SECRET_KEY_REFRESH_TOKEN as string
    })
  }

  login = async ({
    role,
    institution_id,
    user_id,
    status
  }: {
    role: UserRole
    institution_id: string | null
    user_id: string
    status: UserStatus
  }) => {
    const [access_token, refresh_token] = await this.sightAccessTokenAndRefreshToken({
      user_id,
      status,
      institution_id,
      role
    })

    const { exp } = await this.decodeRefreshToken(refresh_token)

    await prisma.userToken.create({
      data: {
        user_id,
        token_string: refresh_token,
        token_type: TokenType.RefreshToken,
        exp: exp as number
      }
    })

    return {
      access_token,
      refresh_token
    }
  }

  sendEmailVerifyToken = async (email: string): Promise<{ otp_token: string; exp: number }> => {
    const exp = new Date(Date.now() + 5 * 60 * 1000).getTime()

    const userToken = await prisma.userToken.findFirst({
      where: {
        user_id: email,
        token_type: TokenType.EmailVerifyToken
      }
    })

    if (userToken) {
      await prisma.userToken.delete({
        where: {
          token_id: userToken.token_id
        }
      })
    }

    const otp_token = await this.emailVerifyToken({
      user_id: email,
      institution_id: null,
      status: UserStatus.inactive,
      role: UserRole.Family,
      token_type: TokenType.EmailVerifyToken,
      exp
    })

    await prisma.userToken.create({
      data: {
        user_id: email,
        token_string: otp_token,
        token_type: TokenType.EmailVerifyToken,
        exp
      }
    })
    console.log('email verify token', otp_token, '--- exp', exp)

    return {
      otp_token,
      exp
    }
  }

  register = async (data: RegisterDto) => {
    const { password } = await hashPassword(data.password)
    const [user, { otp_token, exp }] = await Promise.all([
      prisma.user.create({
        data: {
          email: data.email,
          password,
          role: UserRole.Family
        }
      }),
      this.sendEmailVerifyToken(data.email)
    ])

    const { access_token, refresh_token } = await this.login({
      role: UserRole.Family,
      institution_id: null,
      user_id: user.user_id,
      status: UserStatus.inactive
    })

    return {
      access_token,
      refresh_token
    }
  }

  resendEmailVerify = async (email: string) => {
    await this.sendEmailVerifyToken(email)
  }

  logout = async (token_string: string) => {
    if (!token_string) {
      // Tạm thời cho phép không dùng refresh token
      return
    }
    await prisma.userToken.delete({
      where: { token_string }
    })
  }

  logoutAllDevices = async (user_id: string) => {
    await prisma.userToken.deleteMany({
      where: { user_id }
    })
  }
}

const authService = new AuthService()
export { authService, AuthService }
