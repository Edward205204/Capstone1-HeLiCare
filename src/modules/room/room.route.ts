import { Router } from 'express'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidator } from '../auth/auth.middleware'
import {
  addResidentToRoomValidator,
  createRoomValidator,
  institutionIdParamValidator,
  isHandleByInstitutionAdminOrRoot,
  mustMatchInstitutionParam,
  roomIdValidator,
  updateRoomValidator
} from './room.middleware'
import { roomController } from './room.controller'

const roomRouter = Router()

// Create room
roomRouter.post(
  '/:institution_id/rooms',
  accessTokenValidator,
  isHandleByInstitutionAdminOrRoot,
  institutionIdParamValidator,
  mustMatchInstitutionParam,
  createRoomValidator,
  wrapRequestHandler(roomController.createRoom)
)

// Update room
roomRouter.put(
  '/:institution_id/rooms/:room_id',
  accessTokenValidator,
  isHandleByInstitutionAdminOrRoot,
  institutionIdParamValidator,
  mustMatchInstitutionParam,
  roomIdValidator,
  updateRoomValidator,
  wrapRequestHandler(roomController.updateRoom)
)

// Add resident to room
roomRouter.post(
  '/:institution_id/rooms/:room_id/residents',
  accessTokenValidator,
  isHandleByInstitutionAdminOrRoot,
  institutionIdParamValidator,
  mustMatchInstitutionParam,
  roomIdValidator,
  addResidentToRoomValidator,
  wrapRequestHandler(roomController.addResidentToRoom)
)

// List residents in room
roomRouter.get(
  '/:institution_id/rooms/:room_id/residents',
  accessTokenValidator,
  isHandleByInstitutionAdminOrRoot,
  institutionIdParamValidator,
  mustMatchInstitutionParam,
  roomIdValidator,
  wrapRequestHandler(roomController.listResidentsInRoom)
)

// Delete room
roomRouter.delete(
  '/:institution_id/rooms/:room_id',
  accessTokenValidator,
  isHandleByInstitutionAdminOrRoot,
  institutionIdParamValidator,
  mustMatchInstitutionParam,
  roomIdValidator,
  wrapRequestHandler(roomController.deleteRoom)
)

export default roomRouter


