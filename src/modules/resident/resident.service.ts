import { $Enums, ResidentAssessmentStatus, TokenType, UserRole, FamilyLinkStatus } from '@prisma/client'
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
      where: { institution_id },
      include: {
        chronicDiseases: true,
        allergies: true,
        room: true,
        familyResidentLinks: {
          where: { status: 'active' },
          select: {
            link_id: true,
            family_email: true,
            status: true
          }
        },
        healthAssessments: {
          take: 5,
          orderBy: { created_at: 'desc' },
          select: {
            assessment_id: true,
            created_at: true,
            temperature_c: true,
            blood_pressure_systolic: true,
            blood_pressure_diastolic: true,
            heart_rate: true,
            respiratory_rate: true,
            oxygen_saturation: true,
            notes: true
          }
        }
      }
    })
    return residents
  }

  getResidentById = async (resident_id: string) => {
    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      include: {
        familyResidentLinks: {
          include: {
            family_user: {
              include: {
                familyProfile: true
              }
            }
          }
        },
        healthAssessments: {
          orderBy: { created_at: 'desc' }
        },
        chronicDiseases: true,
        allergies: true,
        room: true,
        assigned_staff: true
      }
    })
    return resident
  }

  // Lấy danh sách người thân liên kết với resident
  getFamilyMembersByResident = async (resident_id: string) => {
    const links = await prisma.familyResidentLink.findMany({
      where: {
        resident_id,
        status: FamilyLinkStatus.active
      },
      include: {
        family_user: {
          include: {
            familyProfile: true
          }
        }
      }
    })

    // Format data để trả về thông tin người thân
    return links.map((link) => ({
      link_id: link.link_id,
      family_user_id: link.family_user_id,
      family_email: link.family_email,
      status: link.status,
      created_at: link.created_at,
      full_name: link.family_user.familyProfile?.full_name || link.family_email,
      phone: link.family_user.familyProfile?.phone || null,
      address: link.family_user.familyProfile?.address || null
    }))
  }

  // Lấy danh sách residents đã liên kết với family user
  getResidentsByFamily = async (family_user_id: string) => {
    const familyLinks = await prisma.familyResidentLink.findMany({
      where: {
        family_user_id,
        status: FamilyLinkStatus.active
      },
      include: {
        resident: {
          include: {
            chronicDiseases: true,
            allergies: true,
            room: {
              select: {
                room_id: true,
                room_number: true,
                type: true
              }
            },
            institution: {
              select: {
                institution_id: true,
                name: true,
                address: true
              }
            },
            healthAssessments: {
              take: 5,
              orderBy: { created_at: 'desc' },
              select: {
                assessment_id: true,
                created_at: true,
                temperature_c: true,
                blood_pressure_systolic: true,
                blood_pressure_diastolic: true,
                heart_rate: true,
                respiratory_rate: true,
                oxygen_saturation: true,
                notes: true
              }
            }
          }
        }
      }
    })

    // Trả về danh sách residents từ links
    return familyLinks.map((link) => link.resident)
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

  // thực hiện bởi staff (có thể link với family)
  createResident = async ({ body }: { body: any }) => {
    const {
      full_name,
      gender,
      date_of_birth,
      admission_date,
      institution_id,
      family_user_id,
      notes,
      chronicDiseases,
      allergies,
      room_id,
      assigned_staff_id,
      height_cm,
      weight_kg,
      bmi
    } = body

    // Validate family_user_id if provided
    if (family_user_id) {
      const familyUser = await prisma.user.findUnique({
        where: { user_id: family_user_id }
      })
      if (!familyUser || familyUser.role !== 'Family') {
        throw new ErrorWithStatus({
          message: 'Invalid family_user_id: User not found or not a Family member',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    // Convert date_of_birth to ISO DateTime if it's just a date string
    let dateOfBirthISO: string
    if (!date_of_birth) {
      throw new ErrorWithStatus({
        message: 'date_of_birth is required',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Handle both "YYYY-MM-DD" and ISO DateTime formats
    if (date_of_birth.includes('T')) {
      dateOfBirthISO = date_of_birth
    } else {
      // Parse date string to ensure it's valid
      const parsedDate = new Date(date_of_birth)
      if (isNaN(parsedDate.getTime())) {
        throw new ErrorWithStatus({
          message: 'Invalid date_of_birth format',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
      dateOfBirthISO = new Date(date_of_birth + 'T00:00:00.000Z').toISOString()
    }

    let admissionDateISO: string | undefined = undefined
    if (admission_date) {
      if (admission_date.includes('T')) {
        admissionDateISO = admission_date
      } else {
        const parsedAdmissionDate = new Date(admission_date)
        if (!isNaN(parsedAdmissionDate.getTime())) {
          admissionDateISO = new Date(admission_date + 'T00:00:00.000Z').toISOString()
        }
      }
    }

    // Calculate BMI if weight and height are provided
    let calculatedBMI = bmi
    if (weight_kg && height_cm && !bmi) {
      const heightInMeters = height_cm / 100
      calculatedBMI = weight_kg / (heightInMeters * heightInMeters)
    }

    // Create resident
    const resident = await prisma.resident.create({
      data: {
        full_name,
        gender,
        date_of_birth: dateOfBirthISO,
        admission_date: admissionDateISO,
        institution_id,
        notes,
        room_id,
        assigned_staff_id,
        height_cm,
        weight_kg,
        bmi: calculatedBMI,
        chronicDiseases: chronicDiseases
          ? {
              create: chronicDiseases.map((disease: any) => {
                let diagnosedAtISO = undefined
                if (disease.diagnosed_at) {
                  diagnosedAtISO = disease.diagnosed_at.includes('T')
                    ? disease.diagnosed_at
                    : new Date(disease.diagnosed_at + 'T00:00:00.000Z').toISOString()
                }
                return {
                  name: disease.name,
                  diagnosed_at: diagnosedAtISO ? new Date(diagnosedAtISO) : undefined,
                  severity: disease.severity,
                  status: disease.status,
                  note: disease.note
                }
              })
            }
          : undefined,
        allergies: allergies
          ? {
              create: allergies.map((allergy: any) => ({
                substance: allergy.substance,
                reaction: allergy.reaction,
                severity: allergy.severity,
                note: allergy.note
              }))
            }
          : undefined
      },
      include: {
        chronicDiseases: true,
        allergies: true
      }
    })

    // Update room occupancy if room_id is provided
    if (room_id) {
      const room = await prisma.room.findUnique({
        where: { room_id }
      })

      if (room) {
        await prisma.room.update({
          where: { room_id },
          data: {
            current_occupancy: room.current_occupancy + 1,
            is_available: room.current_occupancy + 1 < room.capacity
          }
        })
      }
    }

    // Create FamilyResidentLink if family_user_id provided
    if (family_user_id && institution_id) {
      // Get family user email
      const familyUser = await prisma.user.findUnique({
        where: { user_id: family_user_id },
        select: { email: true }
      })

      if (familyUser) {
        // Create FamilyResidentLink
        await prisma.familyResidentLink.create({
          data: {
            family_user_id,
            family_email: familyUser.email,
            resident_id: resident.resident_id,
            institution_id,
            status: 'active'
          }
        })

        // Update institution_id của family user trong User table
        await prisma.user.update({
          where: { user_id: family_user_id },
          data: { institution_id }
        })
      }
    }

    return resident
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

  updateResident = async (resident_id: string, body: any) => {
    const { full_name, gender, date_of_birth, notes, room_id, assigned_staff_id, height_cm, weight_kg, bmi } = body

    // Get current resident to check old room_id
    const currentResident = await prisma.resident.findUnique({
      where: { resident_id },
      select: { room_id: true }
    })

    if (!currentResident) {
      throw new ErrorWithStatus({
        message: 'Resident not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const oldRoomId = currentResident.room_id
    const newRoomId = room_id || null

    // Calculate BMI if weight and height are provided
    let calculatedBMI = bmi
    if (weight_kg && height_cm && !bmi) {
      const heightInMeters = height_cm / 100
      calculatedBMI = weight_kg / (heightInMeters * heightInMeters)
    }

    const data: any = omitBy(
      {
        full_name,
        gender,
        notes,
        room_id,
        assigned_staff_id,
        height_cm,
        weight_kg,
        bmi: calculatedBMI,
        date_of_birth: date_of_birth
          ? new Date(date_of_birth.includes('T') ? date_of_birth : `${date_of_birth}T00:00:00.000Z`)
          : undefined
      },
      isNil
    )

    // Update resident and room occupancy in transaction
    const updated = await prisma.$transaction(async (tx) => {
      const updatedResident = await tx.resident.update({
        where: { resident_id },
        data,
        include: { room: true }
      })

      // Update room occupancy if room_id changed
      if (oldRoomId !== newRoomId) {
        // Decrease occupancy of old room if exists
        if (oldRoomId) {
          const oldRoom = await tx.room.findUnique({
            where: { room_id: oldRoomId }
          })
          if (oldRoom && oldRoom.current_occupancy > 0) {
            await tx.room.update({
              where: { room_id: oldRoomId },
              data: {
                current_occupancy: oldRoom.current_occupancy - 1,
                is_available: true
              }
            })
          }
        }

        // Increase occupancy of new room if exists
        if (newRoomId) {
          const newRoom = await tx.room.findUnique({
            where: { room_id: newRoomId }
          })
          if (newRoom) {
            if (newRoom.current_occupancy >= newRoom.capacity) {
              throw new ErrorWithStatus({
                message: 'Room is at full capacity',
                status: HTTP_STATUS.BAD_REQUEST
              })
            }
            await tx.room.update({
              where: { room_id: newRoomId },
              data: {
                current_occupancy: newRoom.current_occupancy + 1,
                is_available: newRoom.current_occupancy + 1 < newRoom.capacity
              }
            })
          }
        }
      }

      return updatedResident
    })

    return updated
  }

  deleteResident = async (resident_id: string) => {
    // Get resident to check room_id before deletion
    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      select: { room_id: true }
    })

    // Clean up links (on delete cascade not set in schema), remove links first
    await prisma.familyResidentLink.deleteMany({ where: { resident_id } })
    await prisma.careLog.deleteMany({ where: { resident_id } })
    await prisma.healthAssessment.deleteMany({ where: { resident_id } })
    await prisma.schedule.deleteMany({ where: { resident_id } })

    const deleted = await prisma.resident.delete({ where: { resident_id } })

    // Decrease room occupancy if resident was in a room
    if (resident?.room_id) {
      const room = await prisma.room.findUnique({
        where: { room_id: resident.room_id }
      })
      if (room && room.current_occupancy > 0) {
        await prisma.room.update({
          where: { room_id: resident.room_id },
          data: {
            current_occupancy: room.current_occupancy - 1,
            is_available: true
          }
        })
      }
    }

    return deleted
  }
}

const residentService = new ResidentService()

export { residentService, ResidentService }
