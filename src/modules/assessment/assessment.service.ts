import { prisma } from '~/utils/db'

class AssessmentService {
  constructor() {}

  createAssessment = async ({ resident_id, assessment }: { resident_id: string; assessment: any }) => {}
}

const assessmentService = new AssessmentService()

export { assessmentService, AssessmentService }
