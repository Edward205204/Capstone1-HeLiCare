import { HTTP_STATUS } from '~/constants/http_status'
import { AssessmentService, assessmentService as assessmentServiceInstance } from './assessment.service'
import { Request, Response } from 'express'

class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService = assessmentServiceInstance) {}

  createAssessment = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    const { assessment } = req.body
    await this.assessmentService.createAssessment({ resident_id, assessment })
    res.status(HTTP_STATUS.OK).json({ message: 'Assessment created successfully' })
  }
}

const assessmentController = new AssessmentController()

export { assessmentController, AssessmentController }
