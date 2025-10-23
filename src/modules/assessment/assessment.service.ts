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
import omitBy from 'lodash/omitBy'
import isNil from 'lodash/isNil'

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
            full_name: true,
            email: true
          }
        }
      },
      take,
      skip,
      orderBy: { created_at: 'desc' }
    })
    return assessments
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
            full_name: true,
            email: true
          }
        }
      }
    })
    return assessment
  }

  getAssessmentsByResident = async ({ resident_id, take, skip }: GetAssessmentsByResidentParams) => {
    const assessments = await prisma.healthAssessment.findMany({
      where: { resident_id },
      include: {
        assessed_by: {
          select: {
            user_id: true,
            full_name: true,
            email: true
          }
        }
      },
      take,
      skip,
      orderBy: { created_at: 'desc' }
    })
    return assessments
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
            full_name: true,
            email: true
          }
        }
      },
      take,
      skip,
      orderBy: { created_at: 'desc' }
    })
    return assessments
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

    const data = await prisma.healthAssessment.findMany({
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
            full_name: true,
            email: true
          }
        }
      },
      take,
      skip,
      orderBy: { created_at: 'desc' }
    })

    const total = await prisma.healthAssessment.count({ where })

    return { data, total }
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
      notes
    } = assessment

    // Calculate BMI if weight and height are provided
    let calculatedBMI = bmi
    if (weight_kg && height_cm && !bmi) {
      const heightInMeters = height_cm / 100
      calculatedBMI = weight_kg / (heightInMeters * heightInMeters)
    }

    const newAssessment = await prisma.healthAssessment.create({
      data: {
        resident_id,
        assessed_by_id,
        cognitive_status: cognitive_status as any,
        mobility_status: mobility_status as any,
        weight_kg,
        height_cm,
        bmi: calculatedBMI,
        temperature_c,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        heart_rate,
        respiratory_rate,
        oxygen_saturation,
        notes
      }
    })

    return newAssessment
  }

  // PUT Methods
  updateAssessment = async ({ assessment_id, assessment }: UpdateAssessmentParams) => {
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
      notes
    } = assessment

    // Calculate BMI if weight and height are provided
    let calculatedBMI = bmi
    if (weight_kg && height_cm && !bmi) {
      const heightInMeters = height_cm / 100
      calculatedBMI = weight_kg / (heightInMeters * heightInMeters)
    }

    const updatedAssessment = await prisma.healthAssessment.update({
      where: { assessment_id },
      data: {
        cognitive_status: cognitive_status as any,
        mobility_status: mobility_status as any,
        weight_kg,
        height_cm,
        bmi: calculatedBMI,
        temperature_c,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        heart_rate,
        respiratory_rate,
        oxygen_saturation,
        notes
      }
    })

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
