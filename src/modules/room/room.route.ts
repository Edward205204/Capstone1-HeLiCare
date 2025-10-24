import { Router } from 'express'
import { roomController } from './room.controller'
import {
  isHandleByAdminOrRootAdmin,
  createRoomValidator,
  updateRoomValidator,
  roomIdValidator,
  institutionIdValidator,
  addResidentToRoomValidator,
  removeResidentFromRoomValidator
} from './room.middleware'
import { accessTokenValidator } from '../auth/auth.middleware'

const roomRouter = Router()

// Tất cả routes đều cần access token
roomRouter.use(accessTokenValidator)

// Tất cả routes đều cần quyền admin hoặc rootadmin
roomRouter.use(isHandleByAdminOrRootAdmin)

// Routes cho quản lý phòng
roomRouter.post(
  '/institutions/:institution_id/rooms',
  institutionIdValidator,
  createRoomValidator,
  roomController.createRoom
)
roomRouter.get('/institutions/:institution_id/rooms', institutionIdValidator, roomController.getRoomsByInstitution)
roomRouter.get('/rooms/:room_id', roomIdValidator, roomController.getRoomById)
roomRouter.patch('/rooms/:room_id', roomIdValidator, updateRoomValidator, roomController.updateRoom)
roomRouter.delete('/rooms/:room_id', roomIdValidator, roomController.deleteRoom)

// Routes cho quản lý resident trong phòng
roomRouter.post(
  '/institutions/:institution_id/rooms/:room_id/residents',
  institutionIdValidator,
  roomIdValidator,
  addResidentToRoomValidator,
  roomController.addResidentToRoom
)
roomRouter.delete(
  '/institutions/:institution_id/rooms/:room_id/residents',
  institutionIdValidator,
  roomIdValidator,
  removeResidentFromRoomValidator,
  roomController.removeResidentFromRoom
)
roomRouter.get('/rooms/:room_id/residents', roomIdValidator, roomController.getResidentsInRoom)

export default roomRouter
