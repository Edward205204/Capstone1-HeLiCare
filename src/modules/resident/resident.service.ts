import { $Enums, FamilyLinkStatus, ResidentApplicationStatus, TokenType, UserRole } from '@prisma/client'
import { HTTP_STATUS } from '~/constants/http_status'
import { ErrorWithStatus } from '~/models/error'
import { prisma } from '~/utils/db'
import { AuthService, authService as authServiceInstance } from '../auth/auth.service'
import { env } from '~/utils/dot.env'
import { transporter } from '~/utils/transporter'
import { template } from '~/utils/template'

class ResidentService {
  constructor(private readonly authService: AuthService = authServiceInstance) {}

  getListResident = async (institution_id: string) => {
    const residents = await prisma.resident.findMany({
      where: { institution_id }
    })
    return residents
  }

  getResidentById = async (resident_id: string, institution_id: string) => {
    const resident = await prisma.resident.findUnique({
      where: { resident_id, institution_id }
    })
    return resident
  }

  getApplicantByFamilyFullName = async (full_name: string, institution_id: string) => {
    const resident = await prisma.resident.findMany({
      where: { full_name, institution_id },
      include: {
        user: {
          select: {
            user_id: true,
            email: true,
            role: true,
            status: true,
            institution_id: true
          }
        }
      }
    })
    return resident
  }

  getApplicant = async ({ status, institution_id }: { status: string | undefined; institution_id: string }) => {
    if (status === undefined) {
      const resident = await prisma.residentApplication.findMany({ where: { institution_id } })
      return resident
    }
    const resident = await prisma.residentApplication.findMany({
      where: { status: status as ResidentApplicationStatus, institution_id }
    })
    return resident
  }

  // được thực hiện bởi nhân viên của viện
  createProfileForResident = async ({ body, institution_id }: { body: any; institution_id: string }) => {
    const { full_name, gender, date_of_birth, family_user_id } = body
    // family user id là id của bảng user
    const resident = await prisma.resident.create({
      data: {
        full_name,
        gender,
        date_of_birth,
        admission_date: new Date(),
        institution_id
      }
    })

    const familyUser = await prisma.user.findUnique({ where: { user_id: family_user_id } })
    if (!familyUser) throw new ErrorWithStatus({ message: 'Family user not found', status: HTTP_STATUS.NOT_FOUND })
    const token = await this.authService.generateAndSaveToken({
      user_id: familyUser.user_id,
      token_type: TokenType.FamilyLinkToken as unknown as $Enums.TokenType,
      role: UserRole.Family,
      status: familyUser.status,
      institution_id: resident.institution_id
    })

    Promise.all([
      await prisma.familyResidentLink.create({
        data: {
          family_user_id,
          resident_id: resident.resident_id,
          status: FamilyLinkStatus.pending,
          institution_id: resident.institution_id
        }
      }),
      // temp: tạm thời update institution_id của family user, sẽ chuyển phần sử lý này khi người dùng chính thức đăng ký
      await prisma.user.update({
        where: { user_id: familyUser.user_id },
        data: {
          institution_id: resident.institution_id
        }
      }),
      // temp: tạm thời update institution_id của family user, sẽ chuyển phần sử lý này khi người dùng chính thức đăng ký

      await prisma.residentApplication.create({
        data: {
          family_user_id,
          resident_id: resident.resident_id,
          status: ResidentApplicationStatus.pending,
          institution_id: resident.institution_id
        }
      })
    ])

    // temp: tạm thời update institution_id của family user, sẽ chuyển phần sử lý này khi người dùng chính thức đăng ký
    const link = `${env.CLIENT_URL}/verify-family-link?token=${encodeURIComponent(token)}`
    const subject = `Vui lòng nhấn vào đường link bên dưới để kết nối với ${resident.full_name}`
    transporter
      .sendMail({
        from: `<${env.EMAIL_USER}>`,
        to: familyUser.email,
        subject: subject,
        html: template(link, TokenType.FamilyLinkToken)
      })
      .catch((error) => {
        console.log(error)
      })
  }
}

const residentService = new ResidentService()

export { residentService, ResidentService }
