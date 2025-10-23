import { Request, Response, NextFunction } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const checkScheduleOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { schedule_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const schedule = await prisma.schedule.findUnique({
      where: { schedule_id },
      select: { institution_id: true }
    })

    if (!schedule) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Schedule not found'
      })
      return
    }

    if (schedule.institution_id !== institution_id) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'You do not have permission to access this schedule'
      })
      return
    }

    next()
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Error checking schedule ownership'
    })
  }
}

export const checkScheduleExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { schedule_id } = req.params

    const schedule = await prisma.schedule.findUnique({
      where: { schedule_id },
      select: { schedule_id: true }
    })

    if (!schedule) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Schedule not found'
      })
      return
    }

    next()
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Error checking schedule existence'
    })
  }
}

export const checkActivityExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activity_id } = req.body

    if (!activity_id) {
      next()
      return
    }

    const activity = await prisma.activity.findUnique({
      where: { activity_id },
      select: { activity_id: true, is_active: true }
    })

    if (!activity) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Activity not found'
      })
      return
    }

    if (!activity.is_active) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Activity is not active'
      })
      return
    }

    next()
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Error checking activity existence'
    })
  }
}

export const checkResidentAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resident_id } = req.params || req.body
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!resident_id) {
      next()
      return
    }

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
    const { staff_id } = req.params || req.body
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!staff_id) {
      next()
      return
    }

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
