import {
  Prisma,
  $Enums,
  ResidentAssessmentStatus,
  TokenType,
  UserRole,
  FamilyLinkStatus,
  UserStatus
} from '@prisma/client'
import { prisma } from '~/utils/db'
import { AuthService, authService as authServiceInstance } from '../auth/auth.service'
import { GetAppointmentQueryParams, GetResidentListParams, ResidentListResponse } from './resident.dto'
import omitBy from 'lodash/omitBy'
import isNil from 'lodash/isNil'
import { TIME_STATUS } from '~/constants/time-status'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { hashPassword } from '~/utils/hash'

class ResidentService {
  constructor(private readonly authService: AuthService = authServiceInstance) {}

  getListResident = async (params: GetResidentListParams): Promise<ResidentListResponse> => {
    const { institution_id, page, limit, search, room_id } = params

    const where: Prisma.ResidentWhereInput = {
      institution_id
    }

    if (room_id) {
      where.room_id = room_id
    }

    if (search) {
      where.full_name = {
        contains: search,
        mode: 'insensitive'
      }
    }

    const include = {
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

    if (!page || !limit) {
      const residents = await prisma.resident.findMany({
        where,
        include,
        orderBy: {
          created_at: 'desc'
        }
      })

      return {
        residents
      }
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const safePage = Math.max(page, 1)
    const skip = (safePage - 1) * safeLimit

    const [total, residents] = await prisma.$transaction([
      prisma.resident.count({ where }),
      prisma.resident.findMany({
        where,
        include,
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: safeLimit
      })
    ])

    return {
      residents,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit))
      }
    }
  }

  getResidentById = async (resident_id: string) => {
    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      include: {
        familyResidentLinks: {
          where: {
            status: FamilyLinkStatus.active // Chỉ hiển thị links đã active (đã xác thực)
          },
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

  // Lấy dashboard data cho family user (resident đầu tiên hoặc resident được chọn)
  getFamilyDashboardData = async (family_user_id: string, resident_id?: string) => {
    // Nếu có resident_id, tìm family link với resident đó
    // Nếu không, lấy resident đầu tiên từ family links
    const whereClause: any = {
      family_user_id,
      status: FamilyLinkStatus.active
    }

    if (resident_id) {
      whereClause.resident_id = resident_id
    }

    const familyLink = await prisma.familyResidentLink.findFirst({
      where: whereClause,
      include: {
        resident: {
          include: {
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
                name: true
              }
            },
            chronicDiseases: {
              where: {
                status: 'ACTIVE'
              },
              select: {
                id: true,
                name: true,
                severity: true
              }
            },
            allergies: {
              select: {
                id: true,
                substance: true,
                severity: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    if (!familyLink || !familyLink.resident) {
      return null
    }

    const resident = familyLink.resident
    const currentResidentId = resident.resident_id

    // Calculate age
    const age = this.calculateAge(resident.date_of_birth)

    // Lấy latest visit
    const latestVisit = await prisma.visit.findFirst({
      where: {
        family_user_id,
        resident_id: currentResidentId
      },
      orderBy: {
        visit_date: 'desc'
      },
      select: {
        visit_id: true,
        visit_date: true,
        visit_time: true,
        status: true,
        purpose: true
      }
    })

    // Lấy schedules/events hôm nay cho resident
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Lấy schedules hôm nay
    const todaySchedules = await prisma.schedule.findMany({
      where: {
        resident_id: currentResidentId,
        start_time: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        activity: {
          select: {
            name: true,
            type: true
          }
        }
      },
      orderBy: {
        start_time: 'asc'
      }
    })

    // Lấy events hôm nay
    const todayEvents = await prisma.event.findMany({
      where: {
        institution_id: resident.institution_id,
        start_time: {
          gte: today,
          lt: tomorrow
        },
        room_ids: {
          has: resident.room_id || ''
        }
      },
      orderBy: {
        start_time: 'asc'
      }
    })

    // Combine schedules and events
    const combinedSchedules = [
      ...todaySchedules.map((s) => ({
        schedule_id: s.schedule_id,
        event_id: undefined,
        title: s.activity?.name || 'Hoạt động',
        start_time: s.start_time.toISOString(),
        end_time: s.end_time.toISOString(),
        type: s.activity?.type || 'Other',
        status: s.status
      })),
      ...todayEvents.map((e) => ({
        schedule_id: undefined,
        event_id: e.event_id,
        title: e.name,
        start_time: e.start_time.toISOString(),
        end_time: e.end_time.toISOString(),
        type: e.type,
        status: e.status
      }))
    ].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    // Lấy latest vital signs
    const latestVitals = await prisma.healthAssessment.findFirst({
      where: {
        resident_id: currentResidentId
      },
      orderBy: {
        measured_at: 'desc'
      },
      select: {
        assessment_id: true,
        measured_at: true,
        temperature_c: true,
        blood_pressure_systolic: true,
        blood_pressure_diastolic: true,
        heart_rate: true,
        respiratory_rate: true,
        oxygen_saturation: true
      }
    })

    // Lấy health summary để có alerts
    const { healthInsightService } = await import('../assessment/health-insight.service')
    const healthSummary = await healthInsightService.getHealthSummary({ resident_id: currentResidentId })

    return {
      resident: {
        resident_id: resident.resident_id,
        full_name: resident.full_name,
        gender: resident.gender,
        date_of_birth: resident.date_of_birth.toISOString(),
        age,
        room: resident.room,
        institution: resident.institution,
        chronicDiseases: resident.chronicDiseases,
        allergies: resident.allergies
      },
      latestVisit: latestVisit
        ? {
            visit_id: latestVisit.visit_id,
            visit_date: latestVisit.visit_date.toISOString().split('T')[0],
            visit_time: latestVisit.visit_time,
            status: latestVisit.status,
            purpose: latestVisit.purpose
          }
        : null,
      todaySchedules: combinedSchedules,
      latestVitals: latestVitals
        ? {
            assessment_id: latestVitals.assessment_id,
            measured_at: latestVitals.measured_at?.toISOString() || new Date().toISOString(),
            temperature_c: latestVitals.temperature_c,
            blood_pressure_systolic: latestVitals.blood_pressure_systolic,
            blood_pressure_diastolic: latestVitals.blood_pressure_diastolic,
            heart_rate: latestVitals.heart_rate,
            respiratory_rate: latestVitals.respiratory_rate,
            oxygen_saturation: latestVitals.oxygen_saturation
          }
        : null,
      healthAlerts: healthSummary?.alerts || []
    }
  }

  private calculateAge(dateOfBirth: Date) {
    const diffMs = Date.now() - new Date(dateOfBirth).getTime()
    const ageDate = new Date(diffMs)
    return Math.abs(ageDate.getUTCFullYear() - 1970)
  }

  // Generate username from full name with auto-increment
  private async generateUniqueUsername(fullName: string): Promise<string> {
    // Convert to lowercase, remove diacritics, replace spaces with nothing
    const baseUsername = fullName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
      .substring(0, 20) // Limit length

    if (!baseUsername || baseUsername.length === 0) {
      // Fallback if name is empty or invalid
      return `resident${Date.now()}`
    }

    let username = baseUsername
    let counter = 1

    // Check if username exists, increment if needed
    while (true) {
      const emailToCheck = `${username}@resident.local`
      const existingUser = await prisma.user.findUnique({
        where: {
          email: emailToCheck
        }
      })

      if (!existingUser) {
        break
      }

      username = `${baseUsername}${counter}`
      counter++

      // Safety limit to prevent infinite loop
      if (counter > 1000) {
        username = `${baseUsername}${Date.now()}`
        break
      }
    }

    return username
  }

  // Generate temporary password
  private generateTempPassword(): string {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }

  // Get resident dashboard data (for resident users)
  getResidentDashboardData = async (resident_id: string) => {
    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      include: {
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
            name: true
          }
        },
        chronicDiseases: {
          where: {
            status: 'ACTIVE'
          },
          select: {
            id: true,
            name: true,
            severity: true
          }
        },
        allergies: {
          select: {
            id: true,
            substance: true,
            severity: true
          }
        }
      }
    })

    if (!resident) {
      return null
    }

    const age = this.calculateAge(resident.date_of_birth)

    // Get today's schedules
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todaySchedules = await prisma.schedule.findMany({
      where: {
        resident_id,
        start_time: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        activity: {
          select: {
            name: true,
            type: true
          }
        }
      },
      orderBy: {
        start_time: 'asc'
      }
    })

    const todayEvents = await prisma.event.findMany({
      where: {
        institution_id: resident.institution_id,
        start_time: {
          gte: today,
          lt: tomorrow
        },
        room_ids: {
          has: resident.room_id || ''
        }
      },
      orderBy: {
        start_time: 'asc'
      }
    })

    const combinedSchedules = [
      ...todaySchedules.map((s) => ({
        schedule_id: s.schedule_id,
        event_id: undefined,
        title: s.activity?.name || s.title || 'Hoạt động',
        start_time: s.start_time.toISOString(),
        end_time: s.end_time.toISOString(),
        type: s.activity?.type || 'Other',
        status: s.status
      })),
      ...todayEvents.map((e) => ({
        schedule_id: undefined,
        event_id: e.event_id,
        title: e.name,
        start_time: e.start_time.toISOString(),
        end_time: e.end_time.toISOString(),
        type: e.type,
        status: e.status
      }))
    ].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    // Get latest vital signs
    const latestVitals = await prisma.healthAssessment.findFirst({
      where: {
        resident_id
      },
      orderBy: {
        measured_at: 'desc'
      },
      select: {
        assessment_id: true,
        measured_at: true,
        temperature_c: true,
        blood_pressure_systolic: true,
        blood_pressure_diastolic: true,
        heart_rate: true,
        respiratory_rate: true,
        oxygen_saturation: true
      }
    })

    // Get health summary for alerts
    const { healthInsightService } = await import('../assessment/health-insight.service')
    const healthSummary = await healthInsightService.getHealthSummary({ resident_id })

    return {
      resident: {
        resident_id: resident.resident_id,
        full_name: resident.full_name,
        gender: resident.gender,
        date_of_birth: resident.date_of_birth.toISOString(),
        age,
        room: resident.room,
        institution: resident.institution,
        chronicDiseases: resident.chronicDiseases,
        allergies: resident.allergies
      },
      todaySchedules: combinedSchedules,
      latestVitals: latestVitals
        ? {
            assessment_id: latestVitals.assessment_id,
            measured_at: latestVitals.measured_at?.toISOString() || new Date().toISOString(),
            temperature_c: latestVitals.temperature_c,
            blood_pressure_systolic: latestVitals.blood_pressure_systolic,
            blood_pressure_diastolic: latestVitals.blood_pressure_diastolic,
            heart_rate: latestVitals.heart_rate,
            respiratory_rate: latestVitals.respiratory_rate,
            oxygen_saturation: latestVitals.oxygen_saturation
          }
        : null,
      healthAlerts: healthSummary?.alerts || []
    }
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

    // Auto-generate resident account
    let generatedUsername: string | null = null
    let generatedPassword: string | null = null
    let createdUser: any = null

    try {
      generatedUsername = await this.generateUniqueUsername(full_name)
      generatedPassword = this.generateTempPassword()
      const { password: hashedPassword } = await hashPassword(generatedPassword)

      // Create user account for resident with inactive status (chưa đổi mật khẩu)
      createdUser = await prisma.user.create({
        data: {
          email: `${generatedUsername}@resident.local`, // Use .local domain for auto-generated accounts
          password: hashedPassword,
          role: UserRole.Resident,
          status: UserStatus.inactive, // inactive = chưa đổi mật khẩu, active = đã đổi mật khẩu
          institution_id
        }
      })

      // Link user to resident
      await prisma.resident.update({
        where: { resident_id: resident.resident_id },
        data: { user_id: createdUser.user_id }
      })
    } catch (error) {
      console.error('Error creating resident account:', error)
      // Continue even if account creation fails - resident can be created without account
    }

    // Create FamilyResidentLink if family_user_id provided
    if (family_user_id && institution_id) {
      // Get family user email
      const familyUser = await prisma.user.findUnique({
        where: { user_id: family_user_id },
        select: { email: true, role: true, status: true }
      })

      if (familyUser) {
        // Create FamilyResidentLink with pending status (chưa xác thực)
        await prisma.familyResidentLink.create({
          data: {
            family_user_id,
            family_email: familyUser.email,
            resident_id: resident.resident_id,
            institution_id,
            status: 'pending' // Chưa xác thực, cần family click link trong email
          }
        })

        // Update institution_id của family user trong User table
        await prisma.user.update({
          where: { user_id: family_user_id },
          data: { institution_id }
        })

        // Tạo tài khoản mock cho family user (nếu chưa có)
        const { dbmAccountService } = await import('../payment/dbm-account.service')
        try {
          await dbmAccountService.createAccountForUser(family_user_id)
        } catch (error) {
          console.error('Error creating mock account for family user:', error)
          // Không throw error để không ảnh hưởng đến việc tạo resident
        }

        // Gửi email xác thực liên kết đến family
        await this.authService.sendTokenToUserEmail({
          user_id: family_user_id,
          token_type: TokenType.FamilyLinkToken as $Enums.TokenType,
          role: familyUser.role as UserRole,
          status: familyUser.status as UserStatus,
          institution_id,
          email_to: familyUser.email,
          subject: `Vui lòng nhấn vào đường link bên dưới để xác thực liên kết với người thân`
        })
      }
    }

    // Tạo tài khoản mock cho resident user (nếu có)
    if (createdUser) {
      const { dbmAccountService } = await import('../payment/dbm-account.service')
      try {
        await dbmAccountService.createAccountForUser(createdUser.user_id)
      } catch (error) {
        console.error('Error creating mock account for resident user:', error)
        // Không throw error để không ảnh hưởng đến việc tạo resident
      }
    }

    // Return resident with account info if created
    return {
      ...resident,
      account: createdUser
        ? {
            username: generatedUsername,
            password: generatedPassword,
            email: createdUser.email
          }
        : null
    }
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

  assignStaffToResident = async (resident_id: string, staff_id: string, institution_id: string) => {
    // Kiểm tra resident và staff tồn tại và cùng institution
    const [resident, staff] = await Promise.all([
      prisma.resident.findFirst({
        where: {
          resident_id,
          institution_id
        }
      }),
      prisma.user.findFirst({
        where: {
          user_id: staff_id,
          institution_id,
          role: {
            in: [UserRole.Staff, UserRole.Admin, UserRole.RootAdmin]
          }
        }
      })
    ])

    if (!resident) {
      throw new ErrorWithStatus({
        message: 'Resident not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (!staff) {
      throw new ErrorWithStatus({
        message: 'Staff not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Update resident với assigned_staff_id
    const updatedResident = await prisma.resident.update({
      where: { resident_id },
      data: { assigned_staff_id: staff_id },
      include: {
        assigned_staff: {
          include: {
            staffProfile: {
              select: {
                full_name: true,
                phone: true,
                position: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    return updatedResident
  }

  getResidentStaff = async (resident_id: string) => {
    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      include: {
        assigned_staff: {
          include: {
            staffProfile: {
              select: {
                full_name: true,
                phone: true,
                position: true,
                avatar: true,
                hire_date: true
              }
            }
          }
        }
      }
    })

    if (!resident) {
      throw new ErrorWithStatus({
        message: 'Resident not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return resident.assigned_staff
  }

  // Get list of resident accounts for password management
  getResidentAccounts = async ({
    institution_id,
    page,
    limit,
    search,
    password_status, // 'all' | 'not_changed' (inactive) | 'changed' (active)
    sort_by, // 'name' | 'created_at' | 'status'
    sort_order // 'asc' | 'desc'
  }: {
    institution_id: string
    page?: number
    limit?: number
    search?: string
    password_status?: 'all' | 'not_changed' | 'changed'
    sort_by?: 'name' | 'created_at' | 'status'
    sort_order?: 'asc' | 'desc'
  }) => {
    const where: Prisma.ResidentWhereInput = {
      institution_id,
      user_id: {
        not: null // Chỉ lấy residents có account
      }
    }

    if (search) {
      where.full_name = {
        contains: search,
        mode: 'insensitive'
      }
    }

    // Filter by password status
    if (password_status === 'not_changed') {
      where.user = {
        status: UserStatus.inactive
      }
    } else if (password_status === 'changed') {
      where.user = {
        status: UserStatus.active
      }
    }

    const include = {
      user: {
        select: {
          user_id: true,
          email: true,
          status: true,
          created_at: true,
          updated_at: true
        }
      },
      room: {
        select: {
          room_id: true,
          room_number: true
        }
      }
    }

    // Sort
    let orderBy: Prisma.ResidentOrderByWithRelationInput = { created_at: 'desc' }
    if (sort_by === 'name') {
      orderBy = { full_name: sort_order || 'asc' }
    } else if (sort_by === 'created_at') {
      orderBy = { created_at: sort_order || 'desc' }
    } else if (sort_by === 'status') {
      orderBy = {
        user: {
          status: sort_order || 'asc'
        }
      }
    }

    if (!page || !limit) {
      const residents = await prisma.resident.findMany({
        where,
        include,
        orderBy
      })

      return {
        residents: residents.map((r) => ({
          resident_id: r.resident_id,
          full_name: r.full_name,
          user: r.user,
          room: r.room,
          password_status: r.user?.status === UserStatus.inactive ? 'not_changed' : 'changed'
        }))
      }
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const safePage = Math.max(page, 1)
    const skip = (safePage - 1) * safeLimit

    const [total, residents] = await prisma.$transaction([
      prisma.resident.count({ where }),
      prisma.resident.findMany({
        where,
        include,
        orderBy,
        skip,
        take: safeLimit
      })
    ])

    return {
      residents: residents.map((r) => ({
        resident_id: r.resident_id,
        full_name: r.full_name,
        user: r.user,
        room: r.room,
        password_status: r.user?.status === UserStatus.inactive ? 'not_changed' : 'changed'
      })),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit))
      }
    }
  }

  // Staff reset password for resident
  resetResidentPassword = async ({ resident_id, new_password }: { resident_id: string; new_password: string }) => {
    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      include: {
        user: true
      }
    })

    if (!resident) {
      throw new ErrorWithStatus({
        message: 'Resident not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (!resident.user_id) {
      throw new ErrorWithStatus({
        message: 'Resident does not have an account',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Hash new password
    const { password: hashedPassword } = await hashPassword(new_password)

    // Update password and set status to inactive (mật khẩu mới, cần resident đổi lại)
    await prisma.user.update({
      where: { user_id: resident.user_id },
      data: {
        password: hashedPassword,
        status: UserStatus.inactive
      }
    })

    return {
      resident_id: resident.resident_id,
      full_name: resident.full_name,
      message: 'Password reset successfully. Resident needs to change password on first login.'
    }
  }

  // Staff change password for resident (set new password directly)
  changeResidentPassword = async ({ resident_id, new_password }: { resident_id: string; new_password: string }) => {
    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      include: {
        user: true
      }
    })

    if (!resident) {
      throw new ErrorWithStatus({
        message: 'Resident not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (!resident.user_id) {
      throw new ErrorWithStatus({
        message: 'Resident does not have an account',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Hash new password
    const { password: hashedPassword } = await hashPassword(new_password)

    // Update password and set status to active (staff đã set mật khẩu mới)
    await prisma.user.update({
      where: { user_id: resident.user_id },
      data: {
        password: hashedPassword,
        status: UserStatus.active
      }
    })

    return {
      resident_id: resident.resident_id,
      full_name: resident.full_name,
      message: 'Password changed successfully.'
    }
  }
}

const residentService = new ResidentService()

export { residentService, ResidentService }
