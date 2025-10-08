import { $Enums, FamilyLinkStatus, User, UserRole, UserStatus } from '@prisma/client'
import { randomBytes } from 'crypto'
import { HTTP_STATUS } from '~/constants/http_status'
import { TokenType } from '~/constants/token_type'
import { ErrorWithStatus } from '~/models/error'
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
import { template } from '~/utils/template'
import { transporter } from '~/utils/transporter'

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
    institution_id,
    email_to,
    subject
  }: {
    user_id: string
    token_type: $Enums.TokenType
    role: UserRole
    status: UserStatus
    institution_id: string | null
    email_to: string
    subject: string
  }) => {
    const token = await this.generateAndSaveToken({
      user_id,
      token_type: token_type,
      role,
      status,
      institution_id
    })

    transporter
      .sendMail({
        from: `<${env.EMAIL_USER}>`,
        to: email_to,
        subject: subject,
        html: template(token, token_type)
      })
      .catch((error) => {
        console.log(error)
      })
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

    if (data.role === UserRole.Family) {
      await prisma.familyProfile.create({
        data: {
          user_id: user.user_id,
          full_name: data.full_name
        }
      })
    }

    await this.sendTokenToUserEmail({
      user_id: user.user_id,
      token_type: TokenType.EmailVerifyToken,
      role: data.role,
      status: UserStatus.inactive,
      institution_id: null,
      email_to: user.email,
      subject: `Xác thực email của bạn để hoàn tất quá trình đăng ký tài khoản`
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
      institution_id: user.institution_id,
      email_to: user.email,
      subject: `Xác thực email của bạn để hoàn tất quá trình đăng ký tài khoản`
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
      institution_id: user.institution_id,
      email_to: user.email,
      subject: `Xác thực tài khoản của bạn để hoàn tất quá trình đặt lại mật khẩu`
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
      institution_id: data.institution_id,
      email_to: user.email,
      subject: `Vui lòng nhấn vào đường link bên dưới và đặt lại mật khẩu để truy cập vào hệ thống`
    })
  }

  renewInviteTokenForAllMemberOfInstitution = async (user: User) => {
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
      institution_id: user.institution_id,
      email_to: user.email,
      subject: `Vui lòng nhấn vào đường link bên dưới và đặt lại mật khẩu để truy cập vào hệ thống`
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
      institution_id: institution_id,
      email_to: email,
      subject: `Vui lòng nhấn vào đường link bên dưới và đặt lại mật khẩu để truy cập vào hệ thống`
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
      institution_id: institution_id,
      email_to: email,
      subject: `Vui lòng nhấn vào đường link bên dưới và đặt lại mật khẩu để truy cập vào hệ thống`
    })
  }

  // sendFamilyLink = async ({
  //   sender_user_id,
  //   resident_id,
  //   family_email
  // }: {
  //   sender_user_id: string
  //   resident_id: string
  //   family_email: string
  // }) => {
  //   const [sender, resident, familyUser] = await Promise.all([
  //     prisma.user.findUnique({ where: { user_id: sender_user_id } }),
  //     prisma.resident.findUnique({ where: { resident_id } }),
  //     prisma.user.findUnique({ where: { email: family_email } })
  //   ])

  //   if (!sender || !resident || !familyUser) return

  //   // tạo token và gửi email
  //   await this.sendTokenToUserEmail({
  //     user_id: familyUser.user_id,
  //     token_type: TokenType.FamilyLinkToken as unknown as $Enums.TokenType,
  //     role: familyUser.role,
  //     status: familyUser.status,
  //     institution_id: resident.institution_id,
  //     email_to: familyUser.email,
  //     subject: `Vui lòng nhấn vào đường link bên dưới để kết nối với ${resident.full_name}`
  //   })

  //   await prisma.familyResidentLink.upsert({
  //     where: { family_user_id_resident_id: { family_user_id: familyUser.user_id, resident_id } },
  //     update: { status: 'pending' },
  //     create: { family_user_id: familyUser.user_id, resident_id, status: 'pending' }
  //   })

  //   // TODO: tích hợp dịch vụ email, tạm thời log link
  //   // const baseUrl = env.APP_URL || 'http://localhost:3000'
  //   // const link = `${baseUrl}/verify-family-link?token=${encodeURIComponent(token)}`
  //   // console.log('Family link URL:', link)
  // }

  validateFamilyLinkToken = async (token_string: string) => {
    const decoded = await this.decodeCommonToken(token_string)
    const userToken = await prisma.userToken.findUnique({ where: { token_string: token_string } })
    if (!userToken || decoded.token_type !== TokenType.FamilyLinkToken) {
      throw new ErrorWithStatus({
        message: 'Invalid family link token',
        status: HTTP_STATUS.NOT_FOUND
      })
    }
    return decoded
  }

  confirmFamilyLink = async (token_string: string) => {
    const decoded = await this.decodeCommonToken(token_string)
    if (!decoded || decoded.token_type !== TokenType.FamilyLinkToken) {
      throw new ErrorWithStatus({ message: 'Invalid family link token', status: HTTP_STATUS.BAD_REQUEST })
    }
    const family_user_id = decoded.user_id as string
    const userToken = await prisma.userToken.findUnique({ where: { token_string: token_string } })
    if (!userToken) throw new ErrorWithStatus({ message: 'Family link token not found', status: HTTP_STATUS.NOT_FOUND })

    // Tìm resident từ institution_id trong token qua record pending gần nhất
    const pendingLink = await prisma.familyResidentLink.findFirst({
      where: { family_user_id, status: FamilyLinkStatus.pending },
      orderBy: { created_at: 'desc' }
    })
    if (!pendingLink) throw new Error('No pending link found')

    // Kích hoạt liên kết
    await prisma.familyResidentLink.update({
      where: { link_id: pendingLink.link_id },
      data: { status: FamilyLinkStatus.active }
    })

    // Xoá token sau khi dùng
    await prisma.userToken.delete({ where: { token_string } })
  }

  resendFamilyLink = async (family_user_id: string) => {
    const pendingLink = await prisma.familyResidentLink.findFirst({
      where: { family_user_id, status: FamilyLinkStatus.pending },
      orderBy: { created_at: 'desc' }
    })
    const familyUser = await prisma.user.findUnique({ where: { user_id: family_user_id } })

    if (!familyUser) return // đã sử lý ở access_token middleware
    if (!pendingLink)
      throw new ErrorWithStatus({ message: 'You are not linked to any resident', status: HTTP_STATUS.NOT_FOUND })

    // tạo token và gửi email
    await this.sendTokenToUserEmail({
      user_id: family_user_id,
      token_type: TokenType.FamilyLinkToken as $Enums.TokenType,
      role: familyUser.role,
      status: familyUser.status,
      institution_id: familyUser.institution_id,
      email_to: familyUser.email,
      subject: `Vui lòng nhấn vào đường link bên dưới để kết nối với người thân`
    })

    // TODO: tích hợp dịch vụ email, tạm thời log link
    // const baseUrl = env.APP_URL || 'http://localhost:3000'
    // const link = `${baseUrl}/verify-family-link?token=${encodeURIComponent(token)}`
    // console.log('Family link URL:', link)
  }
}

const authService = new AuthService()
export { authService, AuthService }
