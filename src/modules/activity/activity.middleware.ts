import { Request, Response, NextFunction } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const checkActivityOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activity_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const activity = await prisma.activity.findUnique({
      where: { activity_id },
      select: { institution_id: true }
    })

    if (!activity) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Activity not found'
      })
      return
    }

    if (activity.institution_id !== institution_id) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'You do not have permission to access this activity'
      })
      return
    }

    next()
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Error checking activity ownership'
    })
  }
}

export const checkActivityExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activity_id } = req.params

    const activity = await prisma.activity.findUnique({
      where: { activity_id },
      select: { activity_id: true }
    })

    if (!activity) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Activity not found'
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

export const checkInstitutionAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const institution = await prisma.institution.findUnique({
      where: { institution_id },
      select: { institution_id: true, status: true }
    })

    if (!institution) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Institution not found'
      })
      return
    }

    if (institution.status !== 'active') {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'Institution is not active'
      })
      return
    }

    next()
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Error checking institution access'
    })
  }
}
