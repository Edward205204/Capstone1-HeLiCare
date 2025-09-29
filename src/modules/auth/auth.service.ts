import { $Enums, User, UserRole, UserStatus } from '@prisma/client'
import { randomBytes } from 'crypto'
import { TokenType } from '~/constants/token_type'
import {
  AccessTokenPayload,
  CreateStaffForInstitutionDto,
  RefreshTokenPayload,
  RegisterDto,
  TokenPayload
} from '~/modules/auth/auth.dto'
import { prisma } from '~/utils/db'
import { env } from '~/utils/dot.env'
import { hashPassword } from '~/utils/hash'
import { signToken, verifyToken } from '~/utils/jwt'

class AuthService {
  constructor() {}

  private async signAccessTokenAndRefreshToken(payload: TokenPayload): Promise<string[]> {
    const [access_token, refresh_token] = await Promise.all([
      this.accessToken({ ...payload, token_type: TokenType.AccessToken }),
      this.refreshToken({ ...payload, token_type: TokenType.RefreshToken })
    ])
    return [access_token, refresh_token]
  }
  private async accessToken(payload: AccessTokenPayload): Promise<string> {
    return await signToken({
      secretOrPrivateKey: env.JWT_SECRET_KEY_ACCESS_TOKEN as string,
      payload: { ...payload },
      option: { expiresIn: env.ACCESS_TOKEN_EXPIRATION_TIME }
    })
  }

  private async refreshToken(payload: RefreshTokenPayload): Promise<string> {
    if (payload.exp) {
      return await signToken({
        secretOrPrivateKey: env.JWT_SECRET_KEY_REFRESH_TOKEN as string,
        payload: { ...payload }
      })
    }
    return await signToken({
      secretOrPrivateKey: env.JWT_SECRET_KEY_REFRESH_TOKEN as string,
      payload: { ...payload },
      option: { expiresIn: env.REFRESH_TOKEN_EXPIRATION_TIME }
    })
  }

  private async decodeRefreshToken(refresh_token: string) {
    return verifyToken({
      token: refresh_token,
      secretOrPublicKey: env.JWT_SECRET_KEY_REFRESH_TOKEN as string
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
    const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken({
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

  private async commonToken(payload: TokenPayload & { token_type: $Enums.TokenType }): Promise<string> {
    return await signToken({
      secretOrPrivateKey: env.JWT_SECRET_KEY_COMMON_TOKEN as string,
      payload: { ...payload },
      option: { expiresIn: env.COMMON_VERIFY_TOKEN_EXPIRATION_TIME }
    })
  }

  private async decodeCommonToken(token: string) {
    return await verifyToken({
      token: token,
      secretOrPublicKey: env.JWT_SECRET_KEY_COMMON_TOKEN as string
    })
  }

  generateAndSaveToken = async ({
    user_id,
    token_type,
    role,
    status,
    institution_id
  }: {
    user_id: string
    token_type: $Enums.TokenType
    role: UserRole
    status: UserStatus
    institution_id: string | null
  }): Promise<string> => {
    // Xoá token cũ nếu tồn tại và Tạo token mới
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, token] = await Promise.all([
      prisma.userToken.deleteMany({
        where: {
          user_id,
          token_type: token_type
        }
      }),
      this.commonToken({
        user_id,
        token_type: token_type,
        role,
        status,
        institution_id
      })
    ])

    const { exp } = await this.decodeCommonToken(token)
    // Lưu token mới
    await prisma.userToken.create({
      data: {
        user_id,
        token_type,
        token_string: token,
        exp: exp as number
      }
    })

    return token
  }

  sendTokenToUserEmail = async ({
    user_id,
    token_type,
    role,
    status,
    institution_id
  }: {
    user_id: string
    token_type: $Enums.TokenType
    role: UserRole
    status: UserStatus
    institution_id: string | null
  }) => {
    const token = await this.generateAndSaveToken({
      user_id,
      token_type: token_type,
      role,
      status,
      institution_id
    })
    // TODO: sau này thêm mailgun send token vào email người dùng.
    console.log(token)
  }

  register = async (data: RegisterDto): Promise<{ access_token: string; refresh_token: string }> => {
    const { password } = await hashPassword(data.password)
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password,
        role: data.role
      }
    })

    await this.sendTokenToUserEmail({
      user_id: user.user_id,
      token_type: TokenType.EmailVerifyToken,
      role: data.role,
      status: UserStatus.inactive,
      institution_id: null
    })

    const { access_token, refresh_token } = await this.login({
      role: data.role,
      institution_id: null,
      user_id: user.user_id,
      status: UserStatus.inactive
    })

    return {
      access_token,
      refresh_token
    }
  }

  resendEmailVerify = async (user: User) => {
    this.sendTokenToUserEmail({
      user_id: user.user_id,
      token_type: TokenType.EmailVerifyToken,
      role: user.role,
      status: UserStatus.inactive,
      institution_id: user.institution_id
    })
  }

  logout = async (token_string: string) => {
    await prisma.userToken.delete({
      where: { token_string }
    })
  }

  forgotPassword = async (user: User) => {
    await this.sendTokenToUserEmail({
      user_id: user.user_id,
      token_type: TokenType.ForgotPasswordToken,
      role: user.role,
      status: user.status,
      institution_id: user.institution_id
    })
  }

  logoutAllDevices = async (user_id: string) => {
    await prisma.userToken.deleteMany({
      where: { user_id }
    })
  }

  resetPassword = async ({ user_id, password }: { user_id: string; password: string }) => {
    const { password: hashedPassword } = await hashPassword(password)
    await prisma.user.update({
      where: { user_id },
      data: { password: hashedPassword }
    })
    await prisma.userToken.deleteMany({
      where: { user_id, token_type: { in: [TokenType.RefreshToken, TokenType.ForgotPasswordToken] } }
    })
  }

  verifyEmailToken = async (user: User, token_string: string) => {
    const [[access_token, refresh_token]] = await Promise.all([
      this.signAccessTokenAndRefreshToken({
        user_id: user.user_id,
        status: UserStatus.active,
        role: user.role,
        institution_id: user.institution_id
      }),
      prisma.user.update({
        where: { user_id: user.user_id },
        data: { status: UserStatus.active }
      })
    ])

    const { exp } = await this.decodeRefreshToken(refresh_token)

    if (!exp) {
      throw new Error('Exp is not found')
    }

    await Promise.all([
      prisma.userToken.delete({
        where: { token_string }
      }),
      prisma.userToken.create({
        data: {
          user_id: user.user_id,
          token_string: refresh_token,
          token_type: TokenType.RefreshToken,
          exp: exp
        }
      })
    ])

    return {
      access_token,
      refresh_token
    }
  }

  createStaffForInstitution = async (data: CreateStaffForInstitutionDto) => {
    const password = randomBytes(12).toString('hex')
    const { password: hashedPassword } = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        status: UserStatus.inactive,
        institution_id: data.institution_id,
        role: UserRole.Staff
      }
    })

    await prisma.staffProfile.create({
      data: {
        user_id: user.user_id,
        institution_id: data.institution_id,
        full_name: data.full_name,
        phone: data.phone,
        hire_date: data.hire_date,
        notes: data.notes,
        position: data.position
      }
    })

    await this.sendTokenToUserEmail({
      user_id: user.user_id,
      token_type: TokenType.StaffInviteToken,
      role: UserRole.Staff,
      status: UserStatus.inactive,
      institution_id: data.institution_id
    })
  }

  renewInviteToken = async (user: User) => {
    let token_type: $Enums.TokenType | undefined
    if (user.role === UserRole.RootAdmin || user.role === UserRole.Admin) {
      token_type = TokenType.AdminInviteToken
    } else if (user.role === UserRole.Staff) {
      token_type = TokenType.StaffInviteToken
    }
    if (!token_type) {
      throw new Error('Token type is not found')
    }
    await this.sendTokenToUserEmail({
      user_id: user.user_id,
      token_type: token_type,
      role: user.role,
      status: UserStatus.inactive,
      institution_id: user.institution_id
    })
  }

  verifyInviteTokenAndResetPassword = async ({
    email,
    password,
    token_string
  }: {
    email: string
    password: string
    token_string: string
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [{ password: hashedPassword }, _] = await Promise.all([
      hashPassword(password),
      prisma.userToken.delete({
        where: { token_string }
      })
    ])

    await prisma.user.update({
      where: { email },
      data: { status: UserStatus.active, password: hashedPassword }
    })
  }

  createRootAdmin = async ({ email, institution_id }: { email: string; institution_id: string }) => {
    const password = randomBytes(12).toString('hex')
    const { password: hashedPassword } = await hashPassword(password)
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role: UserRole.RootAdmin, institution_id }
    })

    await this.sendTokenToUserEmail({
      user_id: user.user_id,
      token_type: TokenType.AdminInviteToken,
      role: UserRole.RootAdmin,
      status: UserStatus.inactive,
      institution_id: institution_id
    })
  }

  createAdmin = async ({ email, institution_id }: { email: string; institution_id: string }) => {
    const password = randomBytes(12).toString('hex')
    const { password: hashedPassword } = await hashPassword(password)
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role: UserRole.Admin, institution_id, status: UserStatus.inactive }
    })

    await this.sendTokenToUserEmail({
      user_id: user.user_id,
      token_type: TokenType.AdminInviteToken,
      role: UserRole.Admin,
      status: UserStatus.inactive,
      institution_id: institution_id
    })
  }
}

const authService = new AuthService()
export { authService, AuthService }
