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

// Routes cho quản lý phòng
// Get rooms - staff cũng có thể access (lấy rooms của institution từ token)
roomRouter.get('/rooms', roomController.getRoomsByInstitution) // Lấy institution_id từ req.user
roomRouter.get('/rooms/:room_id', roomIdValidator, roomController.getRoomById)
roomRouter.get('/rooms/:room_id/residents', roomIdValidator, roomController.getResidentsInRoom)

// Create/Update/Delete - chỉ admin
roomRouter.post('/rooms', createRoomValidator, isHandleByAdminOrRootAdmin, roomController.createRoom)
roomRouter.patch(
  '/rooms/:room_id',
  roomIdValidator,
  updateRoomValidator,
  isHandleByAdminOrRootAdmin,
  roomController.updateRoom
)
roomRouter.delete('/rooms/:room_id', roomIdValidator, isHandleByAdminOrRootAdmin, roomController.deleteRoom)

// Routes cho quản lý resident trong phòng - chỉ admin
roomRouter.post(
  '/rooms/:room_id/residents',
  roomIdValidator,
  addResidentToRoomValidator,
  isHandleByAdminOrRootAdmin,
  roomController.addResidentToRoom
)
roomRouter.delete(
  '/rooms/:room_id/residents',
  roomIdValidator,
  removeResidentFromRoomValidator,
  isHandleByAdminOrRootAdmin,
  roomController.removeResidentFromRoom
)

export default roomRouter
