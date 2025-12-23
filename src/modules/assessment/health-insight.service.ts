import { CareLogType } from '@prisma/client'
import { prisma } from '~/utils/db'
import {
  HealthCalculationEngine,
  healthCalculationEngine,
  HealthCalculationInput,
  VitalSnapshot,
  CareLogSnapshot
} from './health-calculation.engine'

interface GetHealthSummaryParams {
  resident_id: string
}

export class HealthInsightService {
  constructor(private readonly engine: HealthCalculationEngine = healthCalculationEngine) {}

  async getHealthSummary({ resident_id }: GetHealthSummaryParams) {
    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      include: {
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        },
        room: {
          select: {
            room_number: true
          }
        },
        chronicDiseases: {
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

    const vitals = await prisma.healthAssessment.findMany({
      where: { resident_id },
      orderBy: { measured_at: 'desc' },
      take: 30
    })

    const careLogs = await prisma.careLog.findMany({
      where: { resident_id },
      orderBy: { start_time: 'desc' },
      take: 20,
      select: {
        care_log_id: true,
        type: true,
        title: true,
        status: true,
        start_time: true,
        notes: true
      }
    })

    const calculationInput: HealthCalculationInput = {
      resident: {
        resident_id: resident.resident_id,
        full_name: resident.full_name,
        gender: resident.gender,
        date_of_birth: resident.date_of_birth,
        age: this.calculateAge(resident.date_of_birth),
        chronic_conditions: resident.chronicDiseases.length
      },
      vitals: vitals.map(
        (vital): VitalSnapshot => ({
          assessment_id: vital.assessment_id,
          measured_at: vital.measured_at ?? vital.created_at,
          measurement_shift: vital.measurement_shift,
          measurement_by: vital.measurement_by,
          temperature_c: vital.temperature_c,
          blood_pressure_systolic: vital.blood_pressure_systolic,
          blood_pressure_diastolic: vital.blood_pressure_diastolic,
          heart_rate: vital.heart_rate,
          respiratory_rate: vital.respiratory_rate,
          oxygen_saturation: vital.oxygen_saturation,
          notes: vital.notes
        })
      ),
      careLogs: careLogs.map(
        (log): CareLogSnapshot => ({
          care_log_id: log.care_log_id,
          type: log.type,
          title: log.title,
          status: log.status,
          start_time: log.start_time,
          notes: log.notes
        })
      )
    }

    const analysis = this.engine.analyze(calculationInput)

    return {
      resident: {
        resident_id: resident.resident_id,
        full_name: resident.full_name,
        gender: resident.gender,
        date_of_birth: resident.date_of_birth,
        age: this.calculateAge(resident.date_of_birth),
        room: resident.room,
        institution: resident.institution,
        chronicDiseases: resident.chronicDiseases,
        allergies: resident.allergies
      },
      vitals: {
        latest: vitals[0] || null,
        history: vitals
      },
      careLogs: {
        recent: careLogs
      },
      indicators: analysis.indicators,
      alerts: analysis.alerts,
      meta: analysis.meta
    }
  }

  private calculateAge(dateOfBirth: Date) {
    const diffMs = Date.now() - new Date(dateOfBirth).getTime()
    const ageDate = new Date(diffMs)
    return Math.abs(ageDate.getUTCFullYear() - 1970)
  }
}

export const healthInsightService = new HealthInsightService()
