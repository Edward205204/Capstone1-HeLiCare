import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import { NextFunction, Request, Response } from 'express'
import { UserRole, InstitutionContractStatus } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { commonService } from '~/common/common.service'
import makePatchSchema from '~/utils/make_path_schema'
import {
  roomNumberSchema,
  roomTypeSchema,
  roomCapacitySchema,
  roomNotesSchema,
  residentIdSchema,
  roomIdSchema
} from './room.schema'

// Middleware kiểm tra quyền admin/rootadmin
export const isHandleByAdminOrRootAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.decoded_authorization?.role !== UserRole.Admin && req.decoded_authorization?.role !== UserRole.RootAdmin) {
    return next(
      new ErrorWithStatus({
        message: 'You are not authorized to perform this action. Only Admin and RootAdmin can manage rooms.',
        status: HTTP_STATUS.UNAUTHORIZED
      })
    )
  }
  next()
}

// Validator cho tạo phòng
export const createRoomValidator = validate(
  checkSchema(
    {
      room_number: roomNumberSchema,
      type: roomTypeSchema,
      capacity: roomCapacitySchema,
      notes: roomNotesSchema
    },
    ['body']
  )
)

// Validator cho cập nhật phòng
export const updateRoomValidator = validate(
  checkSchema(
    makePatchSchema({
      room_number: roomNumberSchema,
      type: roomTypeSchema,
      capacity: roomCapacitySchema,
      notes: roomNotesSchema
    }),
    ['body']
  )
)

// Validator cho room_id trong params
export const roomIdValidator = validate(
  checkSchema(
    {
      room_id: {
        ...roomIdSchema,
        custom: {
          options: async (value) => {
            const room = await commonService.getRoomById(value)
            if (!room) {
              throw new ErrorWithStatus({
                message: 'Room not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            return true
          }
        }
      }
    },
    ['params']
  )
)

// Validator cho institution_id trong params
export const institutionIdValidator = validate(
  checkSchema(
    {
      institution_id: {
        notEmpty: {
          errorMessage: 'Institution ID is required'
        },
        isString: {
          errorMessage: 'Institution ID must be a string'
        },
        isUUID: {
          errorMessage: 'Institution ID must be a valid UUID'
        },
        custom: {
          options: async (value) => {
            const institution = await commonService.getInstitutionById(value)
            if (!institution) {
              throw new ErrorWithStatus({
                message: 'Institution not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            if (institution.status !== InstitutionContractStatus.active) {
              throw new ErrorWithStatus({
                message: 'Institution is not active',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            return true
          }
        }
      }
    },
    ['params']
  )
)

// Validator cho thêm resident vào phòng
export const addResidentToRoomValidator = validate(
  checkSchema(
    {
      resident_id: {
        ...residentIdSchema,
        custom: {
          options: async (value, { req }) => {
            const resident = await commonService.getResidentById(value)
            if (!resident) {
              throw new ErrorWithStatus({
                message: 'Resident not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            // Kiểm tra resident có thuộc institution không
            if (resident.institution_id !== req.params?.institution_id) {
              throw new ErrorWithStatus({
                message: 'Resident does not belong to this institution',
                status: HTTP_STATUS.BAD_REQUEST
              })
            }
            // Kiểm tra resident đã có phòng chưa
            if (resident.room_id) {
              throw new ErrorWithStatus({
                message: 'Resident is already assigned to a room',
                status: HTTP_STATUS.BAD_REQUEST
              })
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)

// Validator cho xóa resident khỏi phòng
export const removeResidentFromRoomValidator = validate(
  checkSchema(
    {
      resident_id: {
        ...residentIdSchema,
        custom: {
          options: async (value, { req }) => {
            const resident = await commonService.getResidentById(value)
            if (!resident) {
              throw new ErrorWithStatus({
                message: 'Resident not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            // Kiểm tra resident có thuộc institution không
            if (resident.institution_id !== req.params?.institution_id) {
              throw new ErrorWithStatus({
                message: 'Resident does not belong to this institution',
                status: HTTP_STATUS.BAD_REQUEST
              })
            }
            // Kiểm tra resident có trong phòng này không
            if (resident.room_id !== req.params?.room_id) {
              throw new ErrorWithStatus({
                message: 'Resident is not in this room',
                status: HTTP_STATUS.BAD_REQUEST
              })
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
