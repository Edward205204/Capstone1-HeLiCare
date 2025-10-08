import { $Enums, FamilyLinkStatus, TokenType, UserRole } from '@prisma/client'
import { HTTP_STATUS } from '~/constants/http_status'
import { ErrorWithStatus } from '~/models/error'
import { prisma } from '~/utils/db'
import { AuthService, authService as authServiceInstance } from '../auth/auth.service'
import { env } from '~/utils/dot.env'

class ResidentService {
  constructor(private readonly authService: AuthService = authServiceInstance) {}

  getListResident = async (institution_id: string) => {
    const residents = await prisma.resident.findMany({
      where: { institution_id }
    })
    return residents
  }

  getResidentById = async (resident_id: string) => {
    const resident = await prisma.resident.findUnique({
      where: { resident_id }
    })
    return resident
  }

  createProfileForResident = async ({ body, institution_id }: { body: any; institution_id: string }) => {
    const { full_name, gender, date_of_birth, family_user_id } = body
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

    await prisma.familyResidentLink.create({
      data: {
        family_user_id,
        resident_id: resident.resident_id,
        status: FamilyLinkStatus.pending
      }
    })
    await prisma.user.update({
      where: { user_id: familyUser.user_id },
      data: {
        institution_id: resident.institution_id
      }
    })

    // TODO: tích hợp dịch vụ email, tạm thời log link
    const baseUrl = env.APP_URL || 'http://localhost:3000'
    const link = `${baseUrl}/verify-family-link?token=${encodeURIComponent(token)}`
    console.log('Family link URL:', link)
  }
}

const residentService = new ResidentService()

export { residentService, ResidentService }
