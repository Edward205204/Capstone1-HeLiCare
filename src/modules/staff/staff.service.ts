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

  // Get SOS Alerts (from SOSAlert table and from abnormal vital signs)
  getSOSAlerts = async (institution_id: string) => {
    // Get alerts from SOSAlert table
    const sosAlerts = await prisma.sOSAlert.findMany({
      where: {
        institution_id,
        status: {
          in: ['pending', 'acknowledged', 'in_progress']
        }
      },
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true,
            room: {
              select: {
                room_number: true,
                type: true
              }
            }
          }
        },
        resolved_by: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Format alerts
    const formattedAlerts = sosAlerts.map((alert: any) => {
      const now = new Date()
      const created = new Date(alert.created_at)
      const elapsedSeconds = Math.floor((now.getTime() - created.getTime()) / 1000)
      const timer = alert.timer_seconds ? Math.max(0, alert.timer_seconds - elapsedSeconds) : 60

      // Auto-escalate if timer hits 0
      let status = alert.status
      if (status === 'pending' && timer <= 0) {
        status = 'escalated'
      }

      const roomBed = alert.resident.room ? `Room ${alert.resident.room.room_number}` : 'N/A'

      // Format vital snapshot
      let vitalSnapshot: string | undefined
      if (alert.type === 'abnormal_vitals' && alert.vital_snapshot) {
        const vitals = alert.vital_snapshot as any
        const parts: string[] = []
        if (vitals.bp_systolic && vitals.bp_diastolic) {
          parts.push(`BP: ${vitals.bp_systolic}/${vitals.bp_diastolic}`)
        }
        if (vitals.heart_rate) {
          parts.push(`HR: ${vitals.heart_rate}`)
        }
        if (vitals.temperature) {
          parts.push(`Temp: ${vitals.temperature}°C`)
        }
        if (vitals.oxygen_saturation) {
          parts.push(`SpO2: ${vitals.oxygen_saturation}%`)
        }
        vitalSnapshot = parts.join(', ')
      }

      return {
        id: alert.alert_id,
        residentName: alert.resident.full_name,
        residentId: alert.resident_id,
        roomBed,
        type: alert.type,
        timestamp: alert.created_at.toISOString(),
        vitalSnapshot,
        severity: alert.severity,
        status,
        timer: Math.max(0, timer)
      }
    })

    return formattedAlerts
  }

  // Update alert status
  updateAlertStatus = async (
    alert_id: string,
    institution_id: string,
    status: 'acknowledged' | 'in_progress' | 'resolved' | 'escalated',
    resolved_by_id?: string,
    resolutionNotes?: string
  ) => {
    const updateData: any = {
      status,
      updated_at: new Date()
    }

    if (status === 'resolved' && resolved_by_id) {
      updateData.resolved_by_id = resolved_by_id
      updateData.resolved_at = new Date()
      if (resolutionNotes) {
        updateData.notes = resolutionNotes
      }
    }

    if (status === 'escalated') {
      updateData.escalated_at = new Date()
    }

    const alert = await prisma.sOSAlert.update({
      where: {
        alert_id,
        institution_id
      },
      data: updateData,
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true,
            room: {
              select: {
                room_number: true,
                type: true
              }
            }
          }
        }
      }
    })

    return alert
  }

  // Get abnormal vital signs for a resident
  getAbnormalVitals = async (resident_id: string, institution_id: string) => {
    // First verify resident belongs to institution
    const resident = await prisma.resident.findFirst({
      where: {
        resident_id,
        institution_id
      }
    })

    if (!resident) {
      return null
    }

    // Get latest vital signs
    const latestVitals = await prisma.healthAssessment.findFirst({
      where: {
        resident_id
      },
      orderBy: {
        measured_at: 'desc'
      }
    })

    if (!latestVitals) {
      return null
    }

    // Check for abnormal values using same thresholds as frontend
    const THRESH = {
      systolic: { warnLow: 90, dangerLow: 80, warnHigh: 140, dangerHigh: 160 },
      diastolic: { warnLow: 60, dangerLow: 50, warnHigh: 90, dangerHigh: 100 },
      heartRate: { warnLow: 50, dangerLow: 40, warnHigh: 100, dangerHigh: 130 },
      temperature: { warnLow: 35, dangerLow: 34, warnHigh: 37.5, dangerHigh: 39 },
      respiration: { warnLow: 12, dangerLow: 8, warnHigh: 20, dangerHigh: 30 },
      spo2: { warnLow: 95, dangerLow: 90 }
    }

    const abnormalities: Array<{ type: string; value: number; level: 'warning' | 'critical' }> = []

    // Check systolic BP
    if (latestVitals.blood_pressure_systolic) {
      const val = latestVitals.blood_pressure_systolic
      if (val <= THRESH.systolic.dangerLow || val >= THRESH.systolic.dangerHigh) {
        abnormalities.push({ type: 'systolic', value: val, level: 'critical' })
      } else if (val < THRESH.systolic.warnLow || val >= THRESH.systolic.warnHigh) {
        abnormalities.push({ type: 'systolic', value: val, level: 'warning' })
      }
    }

    // Check diastolic BP
    if (latestVitals.blood_pressure_diastolic) {
      const val = latestVitals.blood_pressure_diastolic
      if (val <= THRESH.diastolic.dangerLow || val >= THRESH.diastolic.dangerHigh) {
        abnormalities.push({ type: 'diastolic', value: val, level: 'critical' })
      } else if (val < THRESH.diastolic.warnLow || val >= THRESH.diastolic.warnHigh) {
        abnormalities.push({ type: 'diastolic', value: val, level: 'warning' })
      }
    }

    // Check heart rate
    if (latestVitals.heart_rate) {
      const val = latestVitals.heart_rate
      if (val <= THRESH.heartRate.dangerLow || val >= THRESH.heartRate.dangerHigh) {
        abnormalities.push({ type: 'heart_rate', value: val, level: 'critical' })
      } else if (val < THRESH.heartRate.warnLow || val >= THRESH.heartRate.warnHigh) {
        abnormalities.push({ type: 'heart_rate', value: val, level: 'warning' })
      }
    }

    // Check temperature
    if (latestVitals.temperature_c) {
      const val = latestVitals.temperature_c
      if (val <= THRESH.temperature.dangerLow || val >= THRESH.temperature.dangerHigh) {
        abnormalities.push({ type: 'temperature', value: val, level: 'critical' })
      } else if (val < THRESH.temperature.warnLow || val >= THRESH.temperature.warnHigh) {
        abnormalities.push({ type: 'temperature', value: val, level: 'warning' })
      }
    }

    // Check respiratory rate
    if (latestVitals.respiratory_rate) {
      const val = latestVitals.respiratory_rate
      if (val <= THRESH.respiration.dangerLow || val >= THRESH.respiration.dangerHigh) {
        abnormalities.push({ type: 'respiration', value: val, level: 'critical' })
      } else if (val < THRESH.respiration.warnLow || val >= THRESH.respiration.warnHigh) {
        abnormalities.push({ type: 'respiration', value: val, level: 'warning' })
      }
    }

    // Check SpO2
    if (latestVitals.oxygen_saturation) {
      const val = latestVitals.oxygen_saturation
      if (val < THRESH.spo2.dangerLow) {
        abnormalities.push({ type: 'spo2', value: val, level: 'critical' })
      } else if (val < THRESH.spo2.warnLow) {
        abnormalities.push({ type: 'spo2', value: val, level: 'warning' })
      }
    }

    if (abnormalities.length === 0) {
      return null
    }

    // Format vital snapshot string
    const parts: string[] = []
    if (latestVitals.blood_pressure_systolic && latestVitals.blood_pressure_diastolic) {
      parts.push(`BP: ${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}`)
    }
    if (latestVitals.heart_rate) {
      parts.push(`HR: ${latestVitals.heart_rate}`)
    }
    if (latestVitals.temperature_c) {
      parts.push(`Temp: ${latestVitals.temperature_c}°C`)
    }
    if (latestVitals.oxygen_saturation) {
      parts.push(`SpO2: ${latestVitals.oxygen_saturation}%`)
    }

    const hasCritical = abnormalities.some((a) => a.level === 'critical')
    const severity = hasCritical ? 'high' : 'medium'

    return {
      resident_id: resident_id,
      measured_at: latestVitals.measured_at,
      vital_snapshot: parts.join(', '),
      abnormalities,
      severity
    }
  }

  // Create incident report
  createIncidentReport = async (
    staff_id: string,
    institution_id: string,
    data: {
      resident_id: string
      incident_type: 'fall' | 'health_event' | 'behavioral' | 'environmental_hazard'
      root_cause?: string
      actions_taken: string
      outcome: string
      occurred_at: Date
      staff_on_duty?: string
      images?: string[]
    }
  ) => {
    const report = await prisma.incidentReport.create({
      data: {
        resident_id: data.resident_id,
        institution_id,
        reported_by_id: staff_id,
        incident_type: data.incident_type,
        root_cause: data.root_cause,
        actions_taken: data.actions_taken,
        outcome: data.outcome,
        occurred_at: data.occurred_at,
        staff_on_duty: data.staff_on_duty,
        images: data.images || []
      },
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true
          }
        },
        reported_by: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      }
    })

    return report
  }

  // Get incident reports
  getIncidentReports = async (institution_id: string, staff_id?: string) => {
    const where: any = {
      institution_id
    }

    if (staff_id) {
      where.reported_by_id = staff_id
    }

    const reports = await prisma.incidentReport.findMany({
      where,
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true
          }
        },
        reported_by: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      },
      orderBy: {
        occurred_at: 'desc'
      }
    })

    return reports.map((report: any) => ({
      id: report.report_id,
      residentId: report.resident_id,
      residentName: report.resident.full_name,
      incidentType: report.incident_type,
      rootCause: report.root_cause || '',
      actionsTaken: report.actions_taken,
      outcome: report.outcome,
      timeOccurred: report.occurred_at.toISOString().split('T')[1].substring(0, 5), // HH:MM
      dateOccurred: report.occurred_at.toISOString().split('T')[0], // YYYY-MM-DD
      staffOnDuty: report.staff_on_duty || report.reported_by.staffProfile?.full_name || '',
      images: report.images
    }))
  }
}

const staffService = new StaffService()
export { staffService, StaffService }
