import { Request, Response } from 'express'
import { visitService } from './visit.service'
import { HTTP_STATUS } from '~/constants/http_status'
import { CreateVisitReqBody, UpdateVisitReqBody, ApproveVisitReqBody } from './visit.dto'

class VisitController {
  // Tạo lịch hẹn thăm viếng
  createVisit = async (req: Request, res: Response) => {
    const family_user_id = req.decoded_authorization?.user_id as string
    const visitData: CreateVisitReqBody = req.body

    const visit = await visitService.createVisit(family_user_id, visitData)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Visit scheduled successfully',
      data: visit
    })
  }

  // Lấy danh sách lịch hẹn của family
  getVisitsByFamily = async (req: Request, res: Response) => {
    const family_user_id = req.decoded_authorization?.user_id as string
    const { status, limit = 20, offset = 0 } = req.query

    const visits = await visitService.getVisitsByFamily(
      family_user_id,
      status as any,
      Number(limit),
      Number(offset)
    )

    res.status(HTTP_STATUS.OK).json({
      message: 'Get family visits successfully',
      data: visits
    })
  }

  // Lấy danh sách lịch hẹn theo ngày (cho admin/staff)
  getVisitsByDate = async (req: Request, res: Response) => {
    const { date, institution_id } = req.query

    const visits = await visitService.getVisitsByDate(
      date as string,
      institution_id as string
    )

    res.status(HTTP_STATUS.OK).json({
      message: 'Get visits by date successfully',
      data: visits
    })
  }

  // Lấy thông tin lịch hẹn chi tiết
  getVisitById = async (req: Request, res: Response) => {
    const { visit_id } = req.params

    const visit = await visitService.getVisitById(visit_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get visit details successfully',
      data: visit
    })
  }

  // Cập nhật lịch hẹn
  updateVisit = async (req: Request, res: Response) => {
    const { visit_id } = req.params
    const updateData: UpdateVisitReqBody = req.body

    const updatedVisit = await visitService.updateVisit(visit_id, updateData)

    res.status(HTTP_STATUS.OK).json({
      message: 'Visit updated successfully',
      data: updatedVisit
    })
  }

  // Duyệt lịch hẹn
  approveVisit = async (req: Request, res: Response) => {
    const { visit_id } = req.params
    const approver_id = req.decoded_authorization?.user_id as string
    const approveData: ApproveVisitReqBody = req.body

    const approvedVisit = await visitService.approveVisit(visit_id, approver_id, approveData)

    res.status(HTTP_STATUS.OK).json({
      message: `Visit ${approveData.status} successfully`,
      data: approvedVisit
    })
  }

  // Xóa lịch hẹn
  deleteVisit = async (req: Request, res: Response) => {
    const { visit_id } = req.params

    const deletedVisit = await visitService.deleteVisit(visit_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Visit deleted successfully',
      data: deletedVisit
    })
  }

  // Lấy thống kê lịch hẹn
  getVisitStats = async (req: Request, res: Response) => {
    const { institution_id } = req.query

    const stats = await visitService.getVisitStats(institution_id as string)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get visit statistics successfully',
      data: stats
    })
  }
}

const visitController = new VisitController()

export { visitController, VisitController }
