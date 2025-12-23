import { CareLogType } from '@prisma/client'

export interface VitalSnapshot {
  assessment_id: string
  measured_at: Date
  measurement_shift?: string | null
  measurement_by?: string | null
  temperature_c?: number | null
  blood_pressure_systolic?: number | null
  blood_pressure_diastolic?: number | null
  heart_rate?: number | null
  respiratory_rate?: number | null
  oxygen_saturation?: number | null
  notes?: string | null
}

export interface CareLogSnapshot {
  care_log_id: string
  type: CareLogType
  title: string
  status: string
  start_time: Date
  notes?: string | null
}

export interface ResidentDemographics {
  resident_id: string
  full_name: string
  gender: string
  date_of_birth: Date
  age: number
  chronic_conditions: number
}

export interface HealthCalculationInput {
  resident: ResidentDemographics
  vitals: VitalSnapshot[]
  careLogs: CareLogSnapshot[]
}

export interface HealthIndicator {
  id: string
  label: string
  value: number
  unit?: string
  severity: 'normal' | 'warning' | 'critical'
  description: string
  trend?: 'up' | 'down' | 'flat'
}

export interface HealthAlert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  recommendation: string
}

export interface HealthCalculationOutput {
  indicators: HealthIndicator[]
  alerts: HealthAlert[]
  meta: {
    engine_version: string
    generated_at: string
    lookback_days: number
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export class HealthCalculationEngine {
  readonly version = '1.0.0'
  readonly lookbackDays = 7

  analyze(input: HealthCalculationInput): HealthCalculationOutput {
    const vitals = [...input.vitals].sort(
      (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
    )
    const careLogs = input.careLogs

    const latest = vitals[0]
    const bpScore = this.scoreBloodPressure(latest)
    const spo2Score = this.scoreOxygen(latest)
    const tempScore = this.scoreTemperature(latest)
    const heartScore = this.scoreHeartRate(latest)
    const adherenceScore = this.scoreCareAdherence(careLogs)
    const alertList = this.buildAlerts({
      latest,
      vitals,
      careLogs,
      bpScore,
      spo2Score,
      tempScore,
      heartScore,
      adherenceScore
    })

    const indicators: HealthIndicator[] = [
      {
        id: 'cardio-stability',
        label: 'Ổn định huyết động',
        value: Math.round(bpScore * 100),
        unit: '%',
        severity: this.severityFromScore(bpScore),
        description: 'Điểm tổng hợp từ xu hướng huyết áp tâm thu/tâm trương.'
      },
      {
        id: 'oxygenation',
        label: 'Tình trạng oxy hóa',
        value: Math.round(spo2Score * 100),
        unit: '%',
        severity: this.severityFromScore(spo2Score),
        description: 'Dựa trên các giá trị SpO₂ gần nhất.'
      },
      {
        id: 'thermoregulation',
        label: 'Điều hòa thân nhiệt',
        value: Math.round(tempScore * 100),
        unit: '%',
        severity: this.severityFromScore(tempScore),
        description: 'Mức độ ổn định nhiệt độ cơ thể.'
      },
      {
        id: 'activity-adherence',
        label: 'Tuân thủ kế hoạch chăm sóc',
        value: Math.round(adherenceScore * 100),
        unit: '%',
        severity: this.severityFromScore(adherenceScore),
        description: 'Số nhật ký chăm sóc đã hoàn thành so với tổng số trong 72 giờ gần nhất.'
      }
    ]

    return {
      indicators,
      alerts: alertList,
      meta: {
        engine_version: this.version,
        generated_at: new Date().toISOString(),
        lookback_days: this.lookbackDays
      }
    }
  }

  private scoreBloodPressure(vital?: VitalSnapshot): number {
    if (!vital?.blood_pressure_systolic || !vital.blood_pressure_diastolic) return 0.5
    const systolic = vital.blood_pressure_systolic
    const diastolic = vital.blood_pressure_diastolic
    const systolicScore = this.scoreWithinRange(systolic, 90, 140)
    const diastolicScore = this.scoreWithinRange(diastolic, 60, 90)
    return (systolicScore + diastolicScore) / 2
  }

  private scoreOxygen(vital?: VitalSnapshot): number {
    if (!vital?.oxygen_saturation) return 0.5
    return this.scoreWithinRange(vital.oxygen_saturation, 92, 100)
  }

  private scoreTemperature(vital?: VitalSnapshot): number {
    if (!vital?.temperature_c) return 0.5
    return this.scoreWithinRange(vital.temperature_c, 35.5, 37.8)
  }

  private scoreHeartRate(vital?: VitalSnapshot): number {
    if (!vital?.heart_rate) return 0.5
    return this.scoreWithinRange(vital.heart_rate, 55, 105)
  }

  private scoreWithinRange(value: number, min: number, max: number) {
    if (value >= min && value <= max) return 1
    const distance = value < min ? min - value : value - max
    if (distance > 30) return 0
    return clamp(1 - distance / 30, 0, 1)
  }

  private scoreCareAdherence(careLogs: CareLogSnapshot[]): number {
    if (!careLogs.length) return 0.4
    const recent = careLogs.filter((log) => {
      const hours = (Date.now() - new Date(log.start_time).getTime()) / (1000 * 60 * 60)
      return hours <= 72
    })
    if (!recent.length) return 0.4
    const completed = recent.filter((log) => log.status === 'completed').length
    return clamp(completed / recent.length, 0, 1)
  }

  private severityFromScore(score: number): 'normal' | 'warning' | 'critical' {
    if (score >= 0.75) return 'normal'
    if (score >= 0.45) return 'warning'
    return 'critical'
  }

  private buildAlerts({
    latest,
    vitals,
    careLogs,
    bpScore,
    spo2Score,
    tempScore,
    heartScore,
    adherenceScore
  }: {
    latest?: VitalSnapshot
    vitals: VitalSnapshot[]
    careLogs: CareLogSnapshot[]
    bpScore: number
    spo2Score: number
    tempScore: number
    heartScore: number
    adherenceScore: number
  }): HealthAlert[] {
    const alerts: HealthAlert[] = []

    const lastMeasurementAgeHours = latest
      ? (Date.now() - new Date(latest.measured_at).getTime()) / (1000 * 60 * 60)
      : Infinity
    if (lastMeasurementAgeHours > 12) {
      alerts.push({
        id: 'stale-vitals',
        severity: 'warning',
        message: 'Không có dấu hiệu sinh tồn mới được ghi nhận trong 12 giờ qua.',
        recommendation: 'Yêu cầu nhân viên đo lại các chỉ số sinh tồn.'
      })
    }

    if (bpScore < 0.45) {
      alerts.push({
        id: 'hypertension-risk',
        severity: 'critical',
        message: 'Chỉ số huyết áp cho thấy sự bất ổn.',
        recommendation: 'Leo thang lên bác sĩ điều trị để đánh giá.'
      })
    }

    if (spo2Score < 0.5) {
      alerts.push({
        id: 'oxygen-drop',
        severity: 'critical',
        message: 'Độ bão hòa oxy dưới ngưỡng an toàn.',
        recommendation: 'Thở oxy bổ sung và kiểm tra lại sau 15 phút.'
      })
    }

    if (tempScore < 0.5 || heartScore < 0.5) {
      alerts.push({
        id: 'infection-risk',
        severity: 'warning',
        message: 'Nhiệt độ hoặc nhịp tim hiển thị các giá trị bất thường.',
        recommendation: 'Xem xét kế hoạch kháng sinh/hạ sốt và theo dõi chặt chẽ.'
      })
    }

    if (adherenceScore < 0.6) {
      alerts.push({
        id: 'careplan-lag',
        severity: 'warning',
        message: 'Tỷ lệ hoàn thành kế hoạch chăm sóc dưới 60% trong 72 giờ qua.',
        recommendation: 'Phân công lại nhân viên hoặc cân bằng khối lượng công việc để thu hẹp khoảng cách.'
      })
    }

    const hydrationEvents = careLogs.filter((log) => log.type === CareLogType.meal)
    if (!hydrationEvents.length) {
      alerts.push({
        id: 'hydration-gap',
        severity: 'info',
        message: 'Không có nhật ký ăn uống / uống nước nào được ghi nhận gần đây.',
        recommendation: 'Đảm bảo lượng nước uống được ghi lại ít nhất hai lần mỗi ca.'
      })
    }

    if (alerts.length === 0) {
      alerts.push({
        id: 'all-clear',
        severity: 'info',
        message: 'Tất cả các chỉ số theo dõi đều nằm trong phạm vi an toàn.',
        recommendation: 'Tiếp tục nhịp độ theo dõi theo lịch trình.'
      })
    }

    return alerts
  }
}

export const healthCalculationEngine = new HealthCalculationEngine()
