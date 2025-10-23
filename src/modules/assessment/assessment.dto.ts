export interface GetAssessmentQueryParams {
  institution_id: string
  take?: number
  skip?: number
  resident_id?: string
  assessed_by_id?: string
  cognitive_status?: string
  mobility_status?: string
  time?: string // 'all', 'lte_today', 'gte_today'
  start_date?: string
  end_date?: string
}

export interface CreateAssessmentParams {
  resident_id: string
  assessment: {
    cognitive_status?: string
    mobility_status?: string
    weight_kg?: number
    height_cm?: number
    bmi?: number
    temperature_c?: number
    blood_pressure_systolic?: number
    blood_pressure_diastolic?: number
    heart_rate?: number
    respiratory_rate?: number
    oxygen_saturation?: number
    notes?: string
  }
  assessed_by_id: string
}

export interface UpdateAssessmentParams {
  assessment_id: string
  assessment: {
    cognitive_status?: string
    mobility_status?: string
    weight_kg?: number
    height_cm?: number
    bmi?: number
    temperature_c?: number
    blood_pressure_systolic?: number
    blood_pressure_diastolic?: number
    heart_rate?: number
    respiratory_rate?: number
    oxygen_saturation?: number
    notes?: string
  }
}

export interface GetAssessmentsParams {
  institution_id: string
  take: number
  skip: number
}

export interface GetAssessmentsByResidentParams {
  resident_id: string
  take: number
  skip: number
}

export interface GetAssessmentsHistoryParams {
  institution_id: string
  take: number
  skip: number
}
