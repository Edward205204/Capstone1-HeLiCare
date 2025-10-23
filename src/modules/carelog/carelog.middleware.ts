import { Request, Response, NextFunction } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const checkCareLogOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { care_log_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const careLog = await prisma.careLog.findUnique({
      where: { care_log_id },
      select: { institution_id: true }
    })

    if (!careLog) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Care log not found'
      })
      return
    }

    if (careLog.institution_id !== institution_id) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'You do not have permission to access this care log'
      })
      return
    }

    next()
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Error checking care log ownership'
    })
  }
}

export const checkCareLogExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { care_log_id } = req.params

    const careLog = await prisma.careLog.findUnique({
      where: { care_log_id },
      select: { care_log_id: true }
    })

    if (!careLog) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Care log not found'
      })
      return
    }

    next()
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Error checking care log existence'
    })
  }
}

export const checkResidentAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resident_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      select: { institution_id: true }
    })

    if (!resident) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Resident not found'
      })
      return
    }

    if (resident.institution_id !== institution_id) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'You do not have permission to access this resident'
      })
      return
    }

    next()
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Error checking resident access'
    })
  }
}

export const checkStaffAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { staff_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const staff = await prisma.user.findUnique({
      where: { user_id: staff_id },
      select: { institution_id: true, role: true }
    })

    if (!staff) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Staff not found'
      })
      return
    }

    if (staff.institution_id !== institution_id) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'You do not have permission to access this staff member'
      })
      return
    }

    if (!['Staff', 'Admin', 'RootAdmin'].includes(staff.role)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'User is not a staff member'
      })
      return
    }

    next()
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Error checking staff access'
    })
  }
}
