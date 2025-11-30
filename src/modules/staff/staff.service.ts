import { TokenType, UserRole, UserStatus, CareTaskStatus, CareLogType } from '@prisma/client'
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
        }
        // Removed status filter to show both active and inactive staff
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

    // Enrich với thông tin tasks và residents
    const enrichedStaffList = await Promise.all(
      staffList.map(async (staff) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Đếm current tasks (pending)
        const currentTasks = await prisma.careLog.count({
          where: {
            staff_id: staff.user_id,
            status: 'pending'
          }
        })

        // Đếm completed tasks today
        const completedTasksToday = await prisma.careLog.count({
          where: {
            staff_id: staff.user_id,
            status: 'completed',
            updated_at: {
              gte: today,
              lt: tomorrow
            }
          }
        })

        // Đếm assigned residents
        const assignedResidents = await prisma.resident.count({
          where: {
            assigned_staff_id: staff.user_id
          }
        })

        // Lấy shift từ schedule hiện tại (nếu có)
        const currentSchedule = await prisma.schedule.findFirst({
          where: {
            staff_id: staff.user_id,
            start_time: {
              lte: new Date()
            },
            end_time: {
              gte: new Date()
            }
          },
          orderBy: {
            start_time: 'desc'
          }
        })

        // Tính shift từ thời gian schedule (morning: 6-12, afternoon: 12-18, evening: 18-24, night: 0-6)
        let shift: string | null = null
        if (currentSchedule) {
          const hour = new Date().getHours()
          if (hour >= 6 && hour < 12) shift = 'Morning'
          else if (hour >= 12 && hour < 18) shift = 'Afternoon'
          else if (hour >= 18 && hour < 24) shift = 'Evening'
          else shift = 'Night'
        }

        return {
          user_id: staff.user_id,
          email: staff.email,
          role: staff.role,
          status: staff.status, // Include status to distinguish active/inactive
          full_name: staff.staffProfile?.full_name || '',
          staff_role: staff.staffProfile?.position || null,
          phone_number: staff.staffProfile?.phone || '',
          shift: shift,
          current_tasks: currentTasks,
          completed_tasks_today: completedTasksToday,
          assigned_residents: assignedResidents,
          avatar: staff.staffProfile?.avatar || null,
          hire_date: staff.staffProfile?.hire_date || null,
          notes: staff.staffProfile?.notes || null
        }
      })
    )

    return enrichedStaffList
  }

  getStaffById = async (staff_id: string, institution_id: string) => {
    const staff = await prisma.user.findFirst({
      where: {
        user_id: staff_id,
        institution_id,
        role: {
          in: [UserRole.Staff, UserRole.Admin, UserRole.RootAdmin]
        }
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
      }
    })

    if (!staff) {
      return null
    }

    return {
      user_id: staff.user_id,
      email: staff.email,
      role: staff.role,
      full_name: staff.staffProfile?.full_name || '',
      staff_role: staff.staffProfile?.position || null,
      phone_number: staff.staffProfile?.phone || '',
      avatar: staff.staffProfile?.avatar || null,
      hire_date: staff.staffProfile?.hire_date || null,
      notes: staff.staffProfile?.notes || null,
      created_at: staff.created_at,
      updated_at: staff.updated_at
    }
  }

  getStaffResidents = async (staff_id: string, institution_id: string) => {
    const residents = await prisma.resident.findMany({
      where: {
        assigned_staff_id: staff_id,
        institution_id
      },
      select: {
        resident_id: true,
        full_name: true,
        gender: true,
        date_of_birth: true,
        room_id: true,
        admission_date: true,
        room: {
          select: {
            room_id: true,
            room_number: true,
            type: true
          }
        }
      },
      orderBy: {
        full_name: 'asc'
      }
    })

    return residents
  }

  getStaffTasks = async (staff_id: string, institution_id: string) => {
    const [pendingTasks, completedTasks] = await Promise.all([
      prisma.careLog.findMany({
        where: {
          staff_id,
          institution_id,
          status: 'pending'
        },
        include: {
          resident: {
            select: {
              resident_id: true,
              full_name: true
            }
          }
        },
        orderBy: {
          start_time: 'asc'
        }
      }),
      prisma.careLog.findMany({
        where: {
          staff_id,
          institution_id,
          status: 'completed'
        },
        include: {
          resident: {
            select: {
              resident_id: true,
              full_name: true
            }
          }
        },
        orderBy: {
          updated_at: 'desc'
        },
        take: 50 // Giới hạn 50 completed tasks gần nhất
      })
    ])

    return {
      pending_tasks: pendingTasks,
      completed_tasks: completedTasks
    }
  }

  assignTaskToStaff = async (
    staff_id: string,
    institution_id: string,
    data: {
      task_type: CareLogType
      resident_id?: string
      due_time: Date
      description?: string
      title: string
    }
  ) => {
    const careLog = await prisma.careLog.create({
      data: {
        staff_id,
        institution_id,
        resident_id: data.resident_id || '',
        type: data.task_type,
        title: data.title,
        description: data.description,
        start_time: data.due_time,
        status: 'pending'
      },
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true
          }
        },
        staff: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true,
                position: true
              }
            }
          }
        }
      }
    })

    return careLog
  }

  markTaskDone = async (task_id: string, staff_id: string) => {
    // Kiểm tra task thuộc về staff
    const task = await prisma.careLog.findFirst({
      where: {
        care_log_id: task_id,
        staff_id
      }
    })

    if (!task) {
      throw new Error('Task not found or not assigned to this staff')
    }

    const updatedTask = await prisma.careLog.update({
      where: {
        care_log_id: task_id
      },
      data: {
        status: 'completed',
        end_time: new Date()
      },
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true
          }
        },
        staff: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true,
                position: true
              }
            }
          }
        }
      }
    })

    return updatedTask
  }

  getStaffPerformance = async (staff_id: string, institution_id: string, month: string) => {
    // Parse month (YYYY-MM)
    const [year, monthNum] = month.split('-').map(Number)
    const startDate = new Date(year, monthNum - 1, 1)
    const endDate = new Date(year, monthNum, 0, 23, 59, 59)

    // Tasks completed trong tháng
    const tasksCompleted = await prisma.careLog.count({
      where: {
        staff_id,
        institution_id,
        status: 'completed',
        updated_at: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Tasks late (completed sau due_time)
    const tasksLate = await prisma.careLog.count({
      where: {
        staff_id,
        institution_id,
        status: 'completed',
        updated_at: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Lấy các tasks completed và so sánh với start_time để tính late
    const completedTasks = await prisma.careLog.findMany({
      where: {
        staff_id,
        institution_id,
        status: 'completed',
        updated_at: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        start_time: true,
        updated_at: true
      }
    })

    const lateCount = completedTasks.filter((task) => {
      return task.updated_at > task.start_time
    }).length

    // Assessments completed (HealthAssessment)
    const assessmentsCompleted = await prisma.healthAssessment.count({
      where: {
        assessed_by_id: staff_id,
        created_at: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Alerts handled (có thể là từ CareLog với type đặc biệt hoặc từ Alert model nếu có)
    // Tạm thời tính từ CareLog với status completed
    const alertsHandled = await prisma.careLog.count({
      where: {
        staff_id,
        institution_id,
        status: 'completed',
        type: 'custom', // Có thể điều chỉnh theo nghiệp vụ
        updated_at: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Tính ranking (A: >= 90%, B: 70-89%, C: < 70%)
    // Giả sử ranking dựa trên tỷ lệ hoàn thành đúng hạn
    const totalTasks = await prisma.careLog.count({
      where: {
        staff_id,
        institution_id,
        created_at: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    let ranking = 'C'
    if (totalTasks > 0) {
      const onTimeRate = ((tasksCompleted - lateCount) / totalTasks) * 100
      if (onTimeRate >= 90) ranking = 'A'
      else if (onTimeRate >= 70) ranking = 'B'
      else ranking = 'C'
    }

    return {
      tasks_completed: tasksCompleted,
      tasks_late: lateCount,
      assessments_completed: assessmentsCompleted,
      alerts_handled: alertsHandled,
      ranking
    }
  }

  createIncident = async (
    staff_id: string,
    institution_id: string,
    data: {
      resident_id: string
      type: string
      description: string
      severity: string
    }
  ) => {
    // Tạo CareLog với type 'custom' để lưu incident
    const incident = await prisma.careLog.create({
      data: {
        staff_id,
        institution_id,
        resident_id: data.resident_id,
        type: 'custom',
        title: `Incident: ${data.type}`,
        description: data.description,
        notes: `Severity: ${data.severity}`,
        start_time: new Date(),
        status: 'pending'
      },
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true
          }
        },
        staff: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true,
                position: true
              }
            }
          }
        }
      }
    })

    return incident
  }

  getIncidents = async (staff_id: string, institution_id: string) => {
    const incidents = await prisma.careLog.findMany({
      where: {
        staff_id,
        institution_id,
        type: 'custom',
        title: {
          startsWith: 'Incident:'
        }
      },
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true
          }
        },
        staff: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true,
                position: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Format incidents để trả về type và severity từ title và notes
    return incidents.map((incident) => {
      const type = incident.title.replace('Incident: ', '')
      const severity = incident.notes?.replace('Severity: ', '') || 'Unknown'
      return {
        incident_id: incident.care_log_id,
        resident_id: incident.resident_id,
        type,
        description: incident.description,
        severity,
        created_at: incident.created_at,
        resident: incident.resident,
        staff: incident.staff
      }
    })
  }
}

const staffService = new StaffService()
export { staffService, StaffService }
