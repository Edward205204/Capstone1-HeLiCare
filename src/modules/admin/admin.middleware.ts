import { Request, Response, NextFunction } from 'express'
import { UserRole } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'

// Middleware kiểm tra quyền Admin hoặc RootAdmin
export const isHandleByAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = req.decoded_authorization?.role
  if (role !== UserRole.Admin && role !== UserRole.RootAdmin) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      message: 'You are not authorized to perform this action. Only Admin and RootAdmin can access this resource.'
    })
    return
  }
  next()
}

// Middleware kiểm tra quyền chỉ RootAdmin
export const isHandleByRootAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = req.decoded_authorization?.role
  if (role !== UserRole.RootAdmin) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      message: 'You are not authorized to perform this action. Only RootAdmin can access this resource.'
    })
    return
  }
  next()
}
