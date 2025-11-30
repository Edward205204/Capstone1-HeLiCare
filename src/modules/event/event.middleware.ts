import { Request, Response, NextFunction } from 'express'
import { HTTP_STATUS } from '~/constants/http_status'
import { prisma } from '~/utils/db'

/**
 * Check if event exists and belongs to the institution
 */
export const checkEventOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string

    if (!institution_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: 'Institution ID not found in token'
      })
      return
    }

    const event = await prisma.event.findUnique({
      where: { event_id },
      select: { institution_id: true }
    })

    if (!event) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Event not found'
      })
      return
    }

    if (event.institution_id !== institution_id) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'You do not have permission to access this event'
      })
      return
    }

    next()
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Error checking event ownership'
    })
  }
}

/**
 * Check if event exists
 */
export const checkEventExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event_id } = req.params

    const event = await prisma.event.findUnique({
      where: { event_id },
      select: { event_id: true }
    })

    if (!event) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Event not found'
      })
      return
    }

    next()
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Error checking event existence'
    })
  }
}
