import { HTTP_STATUS } from '~/constants/http_status'
import { AssessmentService, assessmentService as assessmentServiceInstance } from './assessment.service'
import { Request, Response } from 'express'
import { GetAssessmentQueryParams } from './assessment.dto'
import { HealthInsightService, healthInsightService as healthInsightServiceInstance } from './health-insight.service'

class AssessmentController {
  constructor(
    private readonly assessmentService: AssessmentService = assessmentServiceInstance,
    private readonly healthInsightService: HealthInsightService = healthInsightServiceInstance
  ) {}

  // GET Methods
  getAssessments = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { take, skip } = req.query
    const data = await this.assessmentService.getAssessments({
      institution_id,
      take: Number(take) || 10,
      skip: Number(skip) || 0
    })
    res.status(HTTP_STATUS.OK).json({ message: 'Assessments fetched successfully', data })
  }

  getAssessmentById = async (req: Request, res: Response) => {
    const { assessment_id } = req.params
    const data = await this.assessmentService.getAssessmentById(assessment_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Assessment fetched successfully', data })
  }

  getAssessmentsByResident = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    const { take, skip } = req.query
    const data = await this.assessmentService.getAssessmentsByResident({
      resident_id,
      take: Number(take) || 10,
      skip: Number(skip) || 0
    })
    res.status(HTTP_STATUS.OK).json({ message: 'Resident assessments fetched successfully', data })
  }

  getAssessmentsHistory = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { take, skip } = req.query
    const data = await this.assessmentService.getAssessmentsHistory({
      institution_id,
      take: Number(take) || 10,
      skip: Number(skip) || 0
    })
    res.status(HTTP_STATUS.OK).json({ message: 'Assessment history fetched successfully', data })
  }

  getAssessmentsQuery = async (req: Request, res: Response) => {
    const query = req.query as unknown as GetAssessmentQueryParams
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.assessmentService.getAssessmentsQuery({
      ...query,
      institution_id
    })
    res.status(HTTP_STATUS.OK).json({
      message: 'Assessment query fetched successfully',
      data: {
        assessments: data.data,
        total: data.total
      }
    })
  }

  getHealthSummary = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    const data = await this.healthInsightService.getHealthSummary({ resident_id })
    if (!data) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Resident not found' })
      return
    }
    res.status(HTTP_STATUS.OK).json({
      message: 'Health summary fetched successfully',
      data
    })
  }

  // POST Methods
  createAssessment = async (req: Request, res: Response) => {
    const { resident_id } = req.params
    const { assessment } = req.body
    const assessed_by_id = req.decoded_authorization?.user_id as string
    await this.assessmentService.createAssessment({ resident_id, assessment, assessed_by_id })
    res.status(HTTP_STATUS.OK).json({ message: 'Assessment created successfully' })
  }

  // PUT Methods
  updateAssessment = async (req: Request, res: Response) => {
    const { assessment_id } = req.params
    const { assessment, correction_reason } = req.body
    const corrected_by_id = req.decoded_authorization?.user_id as string
    await this.assessmentService.updateAssessment({
      assessment_id,
      assessment,
      corrected_by_id,
      correction_reason
    })
    res.status(HTTP_STATUS.OK).json({ message: 'Assessment updated successfully' })
  }

  // DELETE Methods
  deleteAssessment = async (req: Request, res: Response) => {
    const { assessment_id } = req.params
    await this.assessmentService.deleteAssessment(assessment_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Assessment deleted successfully' })
  }
}

const assessmentController = new AssessmentController()

export { assessmentController, AssessmentController }
