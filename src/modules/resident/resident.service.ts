import { $Enums, ResidentAssessmentStatus, TokenType, UserRole } from '@prisma/client'
import { prisma } from '~/utils/db'
import { AuthService, authService as authServiceInstance } from '../auth/auth.service'
import { GetAppointmentQueryParams } from './resident.dto'
import omitBy from 'lodash/omitBy'
import isNil from 'lodash/isNil'
import { TIME_STATUS } from '~/constants/time-status'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'

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
      where: { resident_id },
      include: {
        familyResidentLinks: true,
        healthAssessments: true,
        chronicDiseases: true,
        allergies: true,
        room: true,
        assigned_staff: true
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
      where: { status: status as ResidentAssessmentStatus, institution_id }
    })
    return resident
  }

  // thực hiện bởi family
  createResident = async ({ body }: { body: any }) => {
    const { full_name, gender, date_of_birth, admission_date } = body
    const institution_id = body.institution_id
    if (!institution_id) {
      await prisma.resident.create({
        data: {
          full_name,
          gender,
          date_of_birth,
          admission_date
        }
      })
    }

    await prisma.resident.create({
      data: {
        full_name,
        gender,
        date_of_birth,
        admission_date,
        institution_id
      }
    })
  }

  createApplicant = async ({ body }: { body: any }) => {
    const { family_user_id, resident_id, institution_id, appointment_date } = body
    await prisma.residentApplication.create({
      data: { family_user_id, resident_id, institution_id, status: ResidentAssessmentStatus.pending, appointment_date }
    })
  }

  getAppointmentPending = async ({
    institution_id,
    take,
    skip
  }: {
    institution_id: string
    take: number
    skip: number
  }) => {
    const appointments = await prisma.residentApplication.findMany({
      where: { institution_id, status: ResidentAssessmentStatus.pending, appointment_date: { gte: new Date() } },
      take,
      skip,
      orderBy: { appointment_date: 'asc' }
    })
    return appointments
  }

  getAppointmentHistory = async ({
    institution_id,
    take,
    skip
  }: {
    institution_id: string
    take: number
    skip: number
  }) => {
    const appointments = await prisma.residentApplication.findMany({
      where: { institution_id },
      take,
      skip,
      orderBy: { appointment_date: 'desc' }
    })
    return appointments
  }

  async getAppointmentQuery(params: GetAppointmentQueryParams) {
    const { institution_id, take, skip, time } = params
    let { status } = params

    if (status === 'all') status = undefined

    const where: any = omitBy(
      {
        institution_id,
        status
      },
      isNil
    )

    if (time === TIME_STATUS.LTE_TODAY) {
      where.appointment_date = { lte: new Date() }
    } else if (time === TIME_STATUS.GTE_TODAY) {
      where.appointment_date = { gte: new Date() }
    }

    const data = await prisma.residentApplication.findMany({
      where,
      take,
      skip,
      orderBy: { created_at: 'desc' }
    })

    const total = await prisma.residentApplication.count({ where })

    return { data, total }
  }

  joinInstitutionByFamily = async ({
    resident_id,
    institution_id
  }: {
    resident_id: string
    institution_id: string
  }) => {
    //  Song song: update resident + tìm application
    const [_, application] = await Promise.all([
      prisma.resident.update({
        where: { resident_id },
        data: { institution_id }
      }),
      prisma.residentApplication.findFirst({
        where: { resident_id, family_user_id: { not: null } }
      })
    ])

    if (!application) throw new ErrorWithStatus({ message: 'Application not found', status: HTTP_STATUS.NOT_FOUND })

    // Song song: update application + tìm family user
    const [__, familyUser] = await Promise.all([
      prisma.residentApplication.update({
        where: { application_id: application.application_id },
        data: { status: ResidentAssessmentStatus.joined }
      }),
      prisma.user.findUnique({
        where: { user_id: application.family_user_id! }
      })
    ])

    if (!familyUser) throw new ErrorWithStatus({ message: 'Family user not found', status: HTTP_STATUS.NOT_FOUND })

    //  Song song: update user + gửi mail
    await Promise.all([
      prisma.user.update({
        where: { user_id: familyUser.user_id },
        data: { institution_id }
      }),
      this.authService.sendTokenToUserEmail({
        user_id: familyUser.user_id,
        token_type: TokenType.FamilyLinkToken as $Enums.TokenType,
        role: UserRole.Family,
        status: familyUser.status,
        institution_id,
        email_to: familyUser.email,
        subject: `Vui lòng nhấn vào đường link bên dưới để kết nối với người thân`
      })
    ])
  }
}

const residentService = new ResidentService()

export { residentService, ResidentService }
