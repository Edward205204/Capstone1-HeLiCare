import { prisma } from '~/utils/db'
import {
  CreateAssessmentParams,
  UpdateAssessmentParams,
  GetAssessmentsParams,
  GetAssessmentsByResidentParams,
  GetAssessmentsHistoryParams,
  GetAssessmentQueryParams
} from './assessment.dto'
import { TIME_STATUS } from '~/constants/time-status'
import { correctionLogService } from '~/common/correction-log.service'
import { CorrectionSourceType } from '@prisma/client'

class AssessmentService {
  constructor() {}

  // GET Methods
  getAssessments = async ({ institution_id, take, skip }: GetAssessmentsParams) => {
    const assessments = await prisma.healthAssessment.findMany({
      where: {
        resident: {
          institution_id
        }
      },
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true,
            gender: true,
            date_of_birth: true
          }
        },
        assessed_by: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            },
            familyProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      },
      take,
      skip,
      orderBy: { created_at: 'desc' }
    })

    // Format assessed_by để có full_name
    return assessments.map((assessment) => ({
      ...assessment,
      assessed_by: {
        ...assessment.assessed_by,
        full_name:
          assessment.assessed_by.staffProfile?.full_name ||
          assessment.assessed_by.familyProfile?.full_name ||
          assessment.assessed_by.email
      }
    }))
  }

  getAssessmentById = async (assessment_id: string) => {
    const assessment = await prisma.healthAssessment.findUnique({
      where: { assessment_id },
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true,
            gender: true,
            date_of_birth: true,
            institution_id: true
          }
        },
        assessed_by: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            },
            familyProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      }
    })

    if (!assessment) return null

    return {
      ...assessment,
      assessed_by: {
        ...assessment.assessed_by,
        full_name:
          assessment.assessed_by.staffProfile?.full_name ||
          assessment.assessed_by.familyProfile?.full_name ||
          assessment.assessed_by.email
      }
    }
  }

  getAssessmentsByResident = async ({ resident_id, take, skip }: GetAssessmentsByResidentParams) => {
    const assessments = await prisma.healthAssessment.findMany({
      where: { resident_id },
      include: {
        assessed_by: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            },
            familyProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      },
      take,
      skip,
      orderBy: { created_at: 'desc' }
    })

    // Format assessed_by để có full_name
    return assessments.map((assessment) => ({
      ...assessment,
      assessed_by: {
        ...assessment.assessed_by,
        full_name:
          assessment.assessed_by.staffProfile?.full_name ||
          assessment.assessed_by.familyProfile?.full_name ||
          assessment.assessed_by.email
      }
    }))
  }

  getAssessmentsHistory = async ({ institution_id, take, skip }: GetAssessmentsHistoryParams) => {
    const assessments = await prisma.healthAssessment.findMany({
      where: {
        resident: {
          institution_id
        }
      },
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true,
            gender: true,
            date_of_birth: true
          }
        },
        assessed_by: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            },
            familyProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      },
      take,
      skip,
      orderBy: { created_at: 'desc' }
    })

    // Format assessed_by để có full_name
    return assessments.map((assessment) => ({
      ...assessment,
      assessed_by: {
        ...assessment.assessed_by,
        full_name:
          assessment.assessed_by.staffProfile?.full_name ||
          assessment.assessed_by.familyProfile?.full_name ||
          assessment.assessed_by.email
      }
    }))
  }

  getAssessmentsQuery = async (params: GetAssessmentQueryParams) => {
    const {
      institution_id,
      take,
      skip,
      resident_id,
      assessed_by_id,
      cognitive_status,
      mobility_status,
      time,
      start_date,
      end_date
    } = params

    const where: any = {
      resident: {
        institution_id
      }
    }

    // Filter by resident_id
    if (resident_id) {
      where.resident_id = resident_id
    }

    // Filter by assessed_by_id
    if (assessed_by_id) {
      where.assessed_by_id = assessed_by_id
    }

    // Filter by cognitive_status
    if (cognitive_status && cognitive_status !== 'all') {
      where.cognitive_status = cognitive_status
    }

    // Filter by mobility_status
    if (mobility_status && mobility_status !== 'all') {
      where.mobility_status = mobility_status
    }

    // Filter by time
    if (time === TIME_STATUS.LTE_TODAY) {
      where.created_at = { lte: new Date() }
    } else if (time === TIME_STATUS.GTE_TODAY) {
      where.created_at = { gte: new Date() }
    }

    // Filter by date range
    if (start_date && end_date) {
      where.created_at = {
        gte: new Date(start_date),
        lte: new Date(end_date)
      }
    } else if (start_date) {
      where.created_at = { gte: new Date(start_date) }
    } else if (end_date) {
      where.created_at = { lte: new Date(end_date) }
    }

    const assessments = await prisma.healthAssessment.findMany({
      where,
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true,
            gender: true,
            date_of_birth: true
          }
        },
        assessed_by: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            },
            familyProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      },
      take,
      skip,
      orderBy: { created_at: 'desc' }
    })

    // Format assessed_by để có full_name
    const data = assessments.map((assessment) => ({
      ...assessment,
      assessed_by: {
        ...assessment.assessed_by,
        full_name:
          assessment.assessed_by.staffProfile?.full_name ||
          assessment.assessed_by.familyProfile?.full_name ||
          assessment.assessed_by.email
      }
    }))

    const total = await prisma.healthAssessment.count({ where })

    return { data, total }
  }

  // Helper function to calculate shift from date
  private getShiftFromDate(date: Date): string {
    const h = date.getHours()
    // Morning 06:00 - 13:59, Afternoon 14:00 - 21:59, Night 22:00 - 05:59
    if (h >= 6 && h < 14) return 'Morning'
    if (h >= 14 && h < 22) return 'Afternoon'
    return 'Night'
  }

  // Helper function to check vital signs and determine severity
  private checkVitalSigns(assessment: {
    temperature_c?: number | null
    blood_pressure_systolic?: number | null
    blood_pressure_diastolic?: number | null
    heart_rate?: number | null
    respiratory_rate?: number | null
    oxygen_saturation?: number | null
  }): { hasCritical: boolean; hasWarning: boolean; alerts: string[] } {
    const alerts: string[] = []
    let hasCritical = false
    let hasWarning = false

    // Blood pressure checks
    if (assessment.blood_pressure_systolic) {
      if (assessment.blood_pressure_systolic <= 80 || assessment.blood_pressure_systolic >= 160) {
        hasCritical = true
        alerts.push(`Huyết áp tâm thu ${assessment.blood_pressure_systolic} mmHg - Mức nguy hiểm`)
      } else if (assessment.blood_pressure_systolic < 90 || assessment.blood_pressure_systolic >= 140) {
        hasWarning = true
        alerts.push(`Huyết áp tâm thu ${assessment.blood_pressure_systolic} mmHg - Cần theo dõi`)
      }
    }
    if (assessment.blood_pressure_diastolic) {
      if (assessment.blood_pressure_diastolic <= 50 || assessment.blood_pressure_diastolic >= 100) {
        hasCritical = true
        alerts.push(`Huyết áp tâm trương ${assessment.blood_pressure_diastolic} mmHg - Mức nguy hiểm`)
      } else if (assessment.blood_pressure_diastolic < 60 || assessment.blood_pressure_diastolic >= 90) {
        hasWarning = true
        alerts.push(`Huyết áp tâm trương ${assessment.blood_pressure_diastolic} mmHg - Cần theo dõi`)
      }
    }

    // Heart rate checks
    if (assessment.heart_rate) {
      if (assessment.heart_rate <= 40 || assessment.heart_rate >= 130) {
        hasCritical = true
        alerts.push(`Nhịp tim ${assessment.heart_rate} bpm - Mức nguy hiểm`)
      } else if (assessment.heart_rate < 50 || assessment.heart_rate >= 100) {
        hasWarning = true
        alerts.push(`Nhịp tim ${assessment.heart_rate} bpm - Cần theo dõi`)
      }
    }

    // Temperature checks
    if (assessment.temperature_c) {
      if (assessment.temperature_c <= 34 || assessment.temperature_c >= 39) {
        hasCritical = true
        alerts.push(`Nhiệt độ ${assessment.temperature_c}°C - Mức nguy hiểm`)
      } else if (assessment.temperature_c < 35 || assessment.temperature_c >= 37.5) {
        hasWarning = true
        alerts.push(`Nhiệt độ ${assessment.temperature_c}°C - Cần theo dõi`)
      }
    }

    // Respiratory rate checks
    if (assessment.respiratory_rate) {
      if (assessment.respiratory_rate <= 8 || assessment.respiratory_rate >= 30) {
        hasCritical = true
        alerts.push(`Nhịp thở ${assessment.respiratory_rate} lần/phút - Mức nguy hiểm`)
      } else if (assessment.respiratory_rate < 12 || assessment.respiratory_rate >= 20) {
        hasWarning = true
        alerts.push(`Nhịp thở ${assessment.respiratory_rate} lần/phút - Cần theo dõi`)
      }
    }

    // SpO2 checks
    if (assessment.oxygen_saturation) {
      if (assessment.oxygen_saturation < 90) {
        hasCritical = true
        alerts.push(`SpO₂ ${assessment.oxygen_saturation}% - Mức nguy hiểm`)
      } else if (assessment.oxygen_saturation < 95) {
        hasWarning = true
        alerts.push(`SpO₂ ${assessment.oxygen_saturation}% - Cần theo dõi`)
      }
    }

    return { hasCritical, hasWarning, alerts }
  }

  // POST Methods
  createAssessment = async ({ resident_id, assessment, assessed_by_id }: CreateAssessmentParams) => {
    const {
      cognitive_status,
      mobility_status,
      weight_kg,
      height_cm,
      bmi,
      temperature_c,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      respiratory_rate,
      oxygen_saturation,
      notes,
      measured_at
    } = assessment

    // Calculate shift from measured_at
    const measuredAtDate = measured_at ? new Date(measured_at) : new Date()
    const measurement_shift = this.getShiftFromDate(measuredAtDate)

    // Nếu có height/weight, update vào Resident (vì chỉ nhập một lần)
    // Calculate BMI if weight and height are provided
    let calculatedBMI = bmi
    if (weight_kg && height_cm && !bmi) {
      const heightInMeters = height_cm / 100
      calculatedBMI = weight_kg / (heightInMeters * heightInMeters)
    }

    // Update height/weight vào Resident nếu có
    if (weight_kg || height_cm || calculatedBMI) {
      await prisma.resident.update({
        where: { resident_id },
        data: {
          ...(weight_kg && { weight_kg }),
          ...(height_cm && { height_cm }),
          ...(calculatedBMI && { bmi: calculatedBMI })
        }
      })
    }

    // Tạo assessment KHÔNG lưu height/weight/bmi (chỉ lưu vital signs định kỳ)
    const newAssessment = await prisma.healthAssessment.create({
      data: {
        resident_id,
        assessed_by_id,
        cognitive_status: cognitive_status as any,
        mobility_status: mobility_status as any,
        temperature_c,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        heart_rate,
        respiratory_rate,
        oxygen_saturation,
        notes,
        measured_at: measuredAtDate,
        measurement_shift
      }
    })

    // Check vital signs for alerts
    const vitalCheck = this.checkVitalSigns({
      temperature_c,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      respiratory_rate,
      oxygen_saturation
    })

    // TODO: Implement notification system to send alerts to family and staff
    // For now, we log the alerts. The notification system should be implemented
    // to create notifications in the database and send them via email/push notifications
    if (vitalCheck.hasCritical || vitalCheck.hasWarning) {
      const severity = vitalCheck.hasCritical ? 'critical' : 'warning'
      const message = vitalCheck.alerts.join('; ')

      // Log for now - notification system will be implemented separately
      console.log(`[VITAL SIGN ALERT] Resident: ${resident_id}, Severity: ${severity}, Alerts: ${message}`)

      // Get resident info for future notification implementation
      const resident = await prisma.resident.findUnique({
        where: { resident_id },
        include: {
          familyResidentLinks: {
            where: {
              status: 'active' // Chỉ lấy links đã active (đã xác thực)
            },
            include: {
              family_user: {
                select: {
                  user_id: true,
                  email: true
                }
              }
            }
          },
          institution: {
            include: {
              users: {
                where: {
                  role: 'Staff'
                },
                select: {
                  user_id: true,
                  email: true
                }
              }
            }
          }
        }
      })

      // TODO: Create notifications in Notification table when model is available
      // This will notify family members and staff about critical/warning vital signs
    }

    return newAssessment
  }

  // PUT Methods
  updateAssessment = async ({
    assessment_id,
    assessment,
    corrected_by_id,
    correction_reason
  }: UpdateAssessmentParams) => {
    const {
      cognitive_status,
      mobility_status,
      weight_kg,
      height_cm,
      bmi,
      temperature_c,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      respiratory_rate,
      oxygen_saturation,
      notes,
      measured_at
    } = assessment

    // Calculate shift from measured_at
    const measuredAtDate = measured_at ? new Date(measured_at) : new Date()
    const measurement_shift = this.getShiftFromDate(measuredAtDate)

    // Lấy resident_id từ assessment hiện tại
    const currentAssessment = await prisma.healthAssessment.findUnique({
      where: { assessment_id },
      select: {
        resident_id: true,
        cognitive_status: true,
        mobility_status: true,
        temperature_c: true,
        blood_pressure_systolic: true,
        blood_pressure_diastolic: true,
        heart_rate: true,
        respiratory_rate: true,
        oxygen_saturation: true,
        notes: true,
        measured_at: true,
        measurement_shift: true,
        measurement_by: true
      }
    })

    if (!currentAssessment) {
      throw new Error('Assessment not found')
    }

    // Nếu có height/weight, update vào Resident (vì chỉ nhập một lần)
    let calculatedBMI = bmi
    if (weight_kg && height_cm && !bmi) {
      const heightInMeters = height_cm / 100
      calculatedBMI = weight_kg / (heightInMeters * heightInMeters)
    }

    // Update height/weight vào Resident nếu có
    if (weight_kg || height_cm || calculatedBMI) {
      await prisma.resident.update({
        where: { resident_id: currentAssessment.resident_id },
        data: {
          ...(weight_kg && { weight_kg }),
          ...(height_cm && { height_cm }),
          ...(calculatedBMI && { bmi: calculatedBMI })
        }
      })
    }

    // Update assessment KHÔNG lưu height/weight/bmi (chỉ lưu vital signs định kỳ)
    const updatedAssessment = await prisma.healthAssessment.update({
      where: { assessment_id },
      data: {
        cognitive_status: cognitive_status as any,
        mobility_status: mobility_status as any,
        temperature_c,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        heart_rate,
        respiratory_rate,
        oxygen_saturation,
        notes,
        measured_at: measuredAtDate,
        measurement_shift
      }
    })

    if (corrected_by_id) {
      await correctionLogService.recordFieldCorrections({
        source_type: CorrectionSourceType.Assessment,
        source_id: assessment_id,
        corrected_by_id,
        reason: correction_reason,
        before: currentAssessment,
        after: updatedAssessment,
        fields: [
          'cognitive_status',
          'mobility_status',
          'temperature_c',
          'blood_pressure_systolic',
          'blood_pressure_diastolic',
          'heart_rate',
          'respiratory_rate',
          'oxygen_saturation',
          'notes',
          'measured_at',
          'measurement_shift'
        ]
      })
    }

    return updatedAssessment
  }

  // DELETE Methods
  deleteAssessment = async (assessment_id: string) => {
    await prisma.healthAssessment.delete({
      where: { assessment_id }
    })
  }
}

const assessmentService = new AssessmentService()

export { assessmentService, AssessmentService }
