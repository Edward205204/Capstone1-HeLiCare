import { Request, Response } from 'express'
import { visitService } from './visit.service'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  CreateVisitReqBody,
  UpdateVisitReqBody,
  ApproveVisitReqBody,
  CheckAvailabilityReqQuery,
  CheckInReqBody,
  CheckOutReqBody,
  CancelVisitReqBody
} from './visit.dto'

class VisitController {
  // Tạo lịch hẹn thăm viếng
  createVisit = async (req: Request, res: Response) => {
    try {
      const family_user_id = req.decoded_authorization?.user_id as string
      const visitData: CreateVisitReqBody = req.body

      const visit = await visitService.createVisit(family_user_id, visitData)

      res.status(HTTP_STATUS.CREATED).json({
        message: 'Visit scheduled successfully',
        data: visit
      })
    } catch (error: any) {
      if (error.suggestions) {
        res.status(error.status || HTTP_STATUS.BAD_REQUEST).json({
          message: error.message,
          suggestions: error.suggestions
        })
      } else {
        throw error
      }
    }
  }

  // Lấy danh sách lịch hẹn của family
  getVisitsByFamily = async (req: Request, res: Response) => {
    const user_id = req.decoded_authorization?.user_id as string
    const user_role = req.decoded_authorization?.role as string
    const { status, limit = 20, offset = 0 } = req.query

    // Nếu là Family, chỉ lấy visits của chính họ
    // Nếu là Admin/Staff, có thể lấy tất cả visits
    const visits = await visitService.getVisitsByFamily(
      user_id,
      status as any,
      Number(limit),
      Number(offset),
      user_role
    )

    res.status(HTTP_STATUS.OK).json({
      message: 'Get visits successfully',
      data: visits
    })
  }

  // Lấy danh sách lịch hẹn theo ngày (cho admin/staff)
  getVisitsByDate = async (req: Request, res: Response) => {
    const { date, institution_id } = req.query

    const visits = await visitService.getVisitsByDate(date as string, institution_id as string)

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

  // Kiểm tra availability cho một ngày
  checkAvailability = async (req: Request, res: Response) => {
    const { institution_id, date } = req.query as unknown as CheckAvailabilityReqQuery

    const availability = await visitService.checkAvailability(institution_id, date)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get visit availability successfully',
      data: availability
    })
  }

  // Check-in với QR code
  checkIn = async (req: Request, res: Response) => {
    const staff_id = req.decoded_authorization?.user_id as string
    const { qr_code_data } = req.body as CheckInReqBody

    const result = await visitService.checkIn(qr_code_data, staff_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Check-in successful',
      data: result
    })
  }

  // Check-out
  checkOut = async (req: Request, res: Response) => {
    const staff_id = req.decoded_authorization?.user_id as string
    const { visit_id } = req.body as CheckOutReqBody

    const visit = await visitService.checkOut(visit_id, staff_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Check-out successful',
      data: visit
    })
  }

  // Hủy lịch hẹn
  cancelVisit = async (req: Request, res: Response) => {
    const family_user_id = req.decoded_authorization?.user_id as string
    const { visit_id } = req.body as CancelVisitReqBody

    const visit = await visitService.cancelVisit(visit_id, family_user_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Visit cancelled successfully',
      data: visit
    })
  }

  // Lấy danh sách lịch hẹn của resident (cho Resident role)
  getVisitsByResident = async (req: Request, res: Response) => {
    const resident_id = req.decoded_authorization?.resident_id as string
    const { status, limit = 100, offset = 0 } = req.query

    if (!resident_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Resident ID not found in token'
      })
      return
    }

    const visits = await visitService.getVisitsByResident(
      resident_id,
      status as any,
      Number(limit),
      Number(offset)
    )

    res.status(HTTP_STATUS.OK).json({
      message: 'Get visits successfully',
      data: visits
    })
  }
}

const visitController = new VisitController()

export { visitController, VisitController }
