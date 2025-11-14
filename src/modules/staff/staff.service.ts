import { TokenType, UserRole, UserStatus } from '@prisma/client'
import { AuthService, authService as authServiceInstance } from '../auth/auth.service'
import { prisma } from '~/utils/db'
import { randomBytes } from 'crypto'
import { hashPassword } from '~/utils/hash'

import { CreateStaffForInstitutionDto } from './staff.dto'

class StaffService {
  constructor(private readonly authService: AuthService = authServiceInstance) {}

  createStaffForInstitution = async (data: CreateStaffForInstitutionDto) => {
    const avatar = data.avatar || null
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
        avatar: avatar,
        institution_id: data.institution_id,
        full_name: data.full_name,
        phone: data.phone,
        hire_date: data.hire_date,
        notes: data.notes,
        position: data.position
      }
    })

    await this.authService.sendTokenToUserEmail({
      user_id: user.user_id,
      token_type: TokenType.StaffInviteToken,
      role: UserRole.Staff,
      status: UserStatus.inactive,
      institution_id: data.institution_id,
      email_to: user.email,
      subject: `Vui lòng nhấn vào đường link bên dưới và đặt lại mật khẩu để truy cập vào hệ thống`
    })
  }

  verifyInviteTokenAndResetPassword = async ({
    email,
    password,
    token_string,
    avatar
  }: {
    email: string
    password: string
    token_string: string
    avatar?: string | null
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [{ password: hashedPassword }, _] = await Promise.all([
      hashPassword(password),
      prisma.userToken.delete({
        where: { token_string }
      })
    ])

    const user = await prisma.user.update({
      where: { email },
      data: { status: UserStatus.active, password: hashedPassword }
    })

    if (avatar) {
      await prisma.staffProfile.update({
        where: { user_id: user.user_id },
        data: { avatar }
      })
    }
  }

  createRootAdmin = async ({ email, institution_id }: { email: string; institution_id: string }) => {
    const password = randomBytes(12).toString('hex')
    const { password: hashedPassword } = await hashPassword(password)
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role: UserRole.RootAdmin, institution_id }
    })

    await this.authService.sendTokenToUserEmail({
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

    await this.authService.sendTokenToUserEmail({
      user_id: user.user_id,
      token_type: TokenType.AdminInviteToken,
      role: UserRole.Admin,
      status: UserStatus.inactive,
      institution_id: institution_id,
      email_to: email,
      subject: `Vui lòng nhấn vào đường link bên dưới và đặt lại mật khẩu để truy cập vào hệ thống`
    })
  }

  getStaffListByInstitution = async (institution_id: string, take: number, skip: number) => {
    const staffList = await prisma.user.findMany({
      where: {
        institution_id,
        role: {
          in: [UserRole.Staff, UserRole.Admin, UserRole.RootAdmin]
        },
        status: UserStatus.active
      },
      include: {
        staffProfile: {
          select: {
            full_name: true,
            avatar: true,
            phone: true,
            position: true,
            hire_date: true,
            notes: true
          }
        }
      },
      orderBy: {
        staffProfile: {
          full_name: 'asc'
        }
      },
      take,
      skip
    })

    return staffList
  }
}

const staffService = new StaffService()
export { staffService, StaffService }
