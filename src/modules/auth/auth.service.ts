import { $Enums, FamilyLinkStatus, User, UserRole, UserStatus } from '@prisma/client'
import { HTTP_STATUS } from '~/constants/http_status'
import { TokenType } from '~/constants/token_type'
import { ErrorWithStatus } from '~/models/error'
import { AccessTokenPayload, RefreshTokenPayload, RegisterDto, TokenPayload } from '~/modules/auth/auth.dto'
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
    status,
    resident_id
  }: {
    role: UserRole
    institution_id: string | null
    user_id: string
    status: UserStatus
    resident_id?: string
  }) => {
    const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken({
      user_id,
      status,
      institution_id,
      role,
      resident_id
    })

    const { exp } = await this.decodeRefreshToken(refresh_token)

    // Xóa refresh token cũ của user trước khi tạo mới để tránh unique constraint error
    await prisma.userToken.deleteMany({
      where: {
        user_id,
        token_type: TokenType.RefreshToken
      }
    })

    // Tạo refresh token mới sau khi đã xóa token cũ
    await prisma.userToken.create({
      data: {
        user_id,
        token_string: refresh_token,
        token_type: TokenType.RefreshToken,
        exp: exp as number
      }
    })

    // Lấy full thông tin user để trả về
    const user = await prisma.user.findUnique({
      where: { user_id },
      select: {
        user_id: true,
        email: true,
        role: true,
        status: true,
        institution_id: true,
        created_at: true,
        familyProfile: {
          select: {
            full_name: true,
            phone: true,
            address: true
          }
        },
        staffProfile: {
          select: {
            full_name: true,
            phone: true,
            position: true,
            hire_date: true
          }
        },
        resident: {
          select: {
            resident_id: true,
            full_name: true,
            date_of_birth: true,
            gender: true,
            room: {
              select: {
                room_id: true,
                room_number: true
              }
            }
          }
        }
      }
    })

    return {
      access_token,
      refresh_token,
      user
    }
  }

  private async commonToken(payload: TokenPayload & { token_type: $Enums.TokenType }): Promise<string> {
    // Sử dụng EXP_LINKING cho FamilyLinkToken, còn lại dùng COMMON_VERIFY_TOKEN_EXPIRATION_TIME
    const expiresIn =
      payload.token_type === TokenType.FamilyLinkToken
        ? env.EXP_LINKING || '7d'
        : env.COMMON_VERIFY_TOKEN_EXPIRATION_TIME

    return await signToken({
      secretOrPrivateKey: env.JWT_SECRET_KEY_COMMON_TOKEN as string,
      payload: { ...payload },
      option: { expiresIn }
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
    institution_id,
    email
  }: {
    user_id: string
    token_type: $Enums.TokenType
    role: UserRole
    status: UserStatus
    institution_id: string | null
    email?: string
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
        institution_id,
        email
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
    const user = await prisma.user.findUnique({
      where: { user_id },
      select: { email: true }
    })

    const token = await this.generateAndSaveToken({
      user_id,
      token_type: token_type,
      role,
      status,
      institution_id,
      email: user?.email
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

  register = async (data: RegisterDto) => {
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
  }

  createFamilyAccount = async (data: { email: string; full_name: string }) => {
    // Tạo password tạm thời ngẫu nhiên (sẽ yêu cầu đặt password mới qua link reset password trong email)
    const tempPassword =
      Math.random().toString(36).slice(-12) +
      Math.random().toString(36).slice(-12) +
      'A1!'
    const { password } = await hashPassword(tempPassword)

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password,
        role: UserRole.Family,
        status: UserStatus.inactive
      }
    })

    await prisma.familyProfile.create({
      data: {
        user_id: user.user_id,
        full_name: data.full_name
      }
    })

    // Thay vì gửi EmailVerifyToken, ta gửi luôn ForgotPasswordToken
    // để người dùng đặt mật khẩu mới ngay sau khi nhấn vào link trong email.
    await this.sendTokenToUserEmail({
      user_id: user.user_id,
      token_type: TokenType.ForgotPasswordToken,
      role: UserRole.Family,
      status: UserStatus.inactive,
      institution_id: null,
      email_to: user.email,
      subject: `Vui lòng nhấn vào đường link bên dưới và đặt lại mật khẩu để kích hoạt tài khoản gia đình của bạn`
    })

    return { user_id: user.user_id, email: user.email }
  }

  resendEmailVerify = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new ErrorWithStatus({ message: 'User not found', status: HTTP_STATUS.NOT_FOUND })
    }
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
    // Use deleteMany to avoid error if token doesn't exist (already deleted or expired)
    await prisma.userToken.deleteMany({
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
      data: {
        password: hashedPassword,
        // Bất kể là flow quên mật khẩu hay tạo tài khoản mới,
        // sau khi đặt mật khẩu xong thì đảm bảo user đang ở trạng thái active.
        status: UserStatus.active
      }
    })
    await prisma.userToken.deleteMany({
      where: { user_id, token_type: { in: [TokenType.RefreshToken, TokenType.ForgotPasswordToken] } }
    })
  }

  changePassword = async ({
    user_id,
    current_password,
    new_password
  }: {
    user_id: string
    current_password: string
    new_password: string
  }) => {
    const user = await prisma.user.findUnique({
      where: { user_id }
    })

    if (!user) {
      throw new ErrorWithStatus({
        message: 'User not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Verify current password
    const { verifyPassword } = await import('~/utils/hash')
    const isValidPassword = await verifyPassword(current_password, user.password)

    if (!isValidPassword) {
      throw new ErrorWithStatus({
        message: 'Current password is incorrect',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Hash and update new password
    const { password: hashedPassword } = await hashPassword(new_password)
    // Update password and set status to active (đã đổi mật khẩu)
    await prisma.user.update({
      where: { user_id },
      data: {
        password: hashedPassword,
        status: UserStatus.active // Khi resident đổi mật khẩu thì set status = active
      }
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

    // Delete old token if exists (use deleteMany to avoid error if token doesn't exist)
    await prisma.userToken.deleteMany({
      where: { token_string }
    })

    // Create new refresh token
    await prisma.userToken.create({
      data: {
        user_id: user.user_id,
        token_string: refresh_token,
        token_type: TokenType.RefreshToken,
        exp: exp
      }
    })

    // Nếu là Family user, tự động liên kết với resident có email này (nếu có)
    if (user.role === UserRole.Family) {
      // Tìm FamilyResidentLink có family_user_id = user_id hiện tại và status = pending
      // (link đã được tạo khi tạo resident với user chưa active)
      const pendingLinks = await prisma.familyResidentLink.findMany({
        where: {
          family_user_id: user.user_id,
          status: FamilyLinkStatus.pending
        },
        include: {
          resident: {
            select: {
              resident_id: true,
              institution_id: true
            }
          }
        }
      })

      // Tự động active các link pending (vì user đã verify email)
      for (const link of pendingLinks) {
        await prisma.familyResidentLink.update({
          where: { link_id: link.link_id },
          data: { status: FamilyLinkStatus.active }
        })

        // Cập nhật institution_id của user nếu chưa có
        if (!user.institution_id && link.institution_id) {
          await prisma.user.update({
            where: { user_id: user.user_id },
            data: { institution_id: link.institution_id }
          })
        }
      }

      // Tìm FamilyResidentLink có family_email = email của user và status = pending
      // và family_user_id khác với user_id hiện tại (trường hợp link được tạo với email nhưng user_id khác)
      const pendingLinksByEmail = await prisma.familyResidentLink.findMany({
        where: {
          family_email: user.email,
          status: FamilyLinkStatus.pending,
          NOT: {
            family_user_id: user.user_id
          }
        },
        include: {
          resident: {
            select: {
              resident_id: true,
              institution_id: true
            }
          }
        }
      })

      // Cập nhật family_user_id cho các link pending
      for (const link of pendingLinksByEmail) {
        // Kiểm tra xem đã có link với user_id này chưa
        const existingLink = await prisma.familyResidentLink.findUnique({
          where: {
            family_user_id_resident_id: {
              family_user_id: user.user_id,
              resident_id: link.resident_id
            }
          }
        })

        if (!existingLink) {
          // Xóa link cũ và tạo link mới với user_id đúng
          await prisma.familyResidentLink.delete({
            where: { link_id: link.link_id }
          })

          await prisma.familyResidentLink.create({
            data: {
              family_user_id: user.user_id,
              family_email: user.email,
              resident_id: link.resident_id,
              institution_id: link.institution_id,
              status: FamilyLinkStatus.active // Tự động active vì user đã verify email
            }
          })

          // Cập nhật institution_id của user nếu chưa có
          if (!user.institution_id && link.institution_id) {
            await prisma.user.update({
              where: { user_id: user.user_id },
              data: { institution_id: link.institution_id }
            })
          }
        }
      }
    }

    return {
      access_token,
      refresh_token
    }
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
    const institution_id = decoded.institution_id as string | null
    const userToken = await prisma.userToken.findUnique({ where: { token_string: token_string } })
    if (!userToken) throw new ErrorWithStatus({ message: 'Family link token not found', status: HTTP_STATUS.NOT_FOUND })

    // Tìm resident từ institution_id trong token qua record pending gần nhất
    // Nếu có institution_id trong token, filter theo đó để chính xác hơn
    const whereClause: any = {
      family_user_id,
      status: FamilyLinkStatus.pending
    }
    if (institution_id) {
      whereClause.institution_id = institution_id
    }

    const pendingLink = await prisma.familyResidentLink.findFirst({
      where: whereClause,
      orderBy: { created_at: 'desc' }
    })

    if (!pendingLink) {
      throw new ErrorWithStatus({
        message: 'No pending link found. The link may have already been confirmed or expired.',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Kích hoạt liên kết
    await prisma.familyResidentLink.update({
      where: { link_id: pendingLink.link_id },
      data: { status: FamilyLinkStatus.active }
    })

    // Xoá token sau khi dùng (use deleteMany to avoid error if token doesn't exist)
    await prisma.userToken.deleteMany({ where: { token_string } })
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
  }

  checkUserByEmail = async (email: string) => {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        user_id: true,
        email: true,
        role: true,
        status: true,
        familyProfile: {
          select: {
            full_name: true,
            phone: true
          }
        }
      }
    })

    if (!user) {
      throw new ErrorWithStatus({
        message: 'User not found with this email',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (user.role !== UserRole.Family) {
      throw new ErrorWithStatus({
        message: 'User is not a Family member',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    if (user.status !== UserStatus.active) {
      throw new ErrorWithStatus({
        message: 'User account is not active. Please verify email first.',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    return {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      status: user.status,
      family_name: user.familyProfile?.full_name || null,
      family_phone: user.familyProfile?.phone || null
    }
  }
}

const authService = new AuthService()
export { authService, AuthService }
