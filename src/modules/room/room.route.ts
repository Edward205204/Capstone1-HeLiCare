import { Router } from 'express'
import { roomController } from './room.controller'
import {
  // isHandleByAdminOrRootAdmin,
  createRoomValidator,
  updateRoomValidator,
  roomIdValidator,
  // institutionIdValidator,
  addResidentToRoomValidator,
  removeResidentFromRoomValidator
} from './room.middleware'
import { accessTokenValidator } from '../auth/auth.middleware'
import { isHandleByAdminOrStaff } from '../feedback/feedback.middleware'

const roomRouter = Router()

// Tất cả routes đều cần access token
roomRouter.use(accessTokenValidator)

// Routes cho quản lý phòng
// Get rooms - staff cũng có thể access (lấy rooms của institution từ token)
roomRouter.get('/rooms', roomController.getRoomsByInstitution) // Lấy institution_id từ req.user
roomRouter.get('/rooms/:room_id', roomIdValidator, roomController.getRoomById)
roomRouter.get('/rooms/:room_id/residents', roomIdValidator, roomController.getResidentsInRoom)

// Create/Update/Delete - chỉ admin hoặc staff
roomRouter.post('/rooms', createRoomValidator, isHandleByAdminOrStaff, roomController.createRoom)
roomRouter.patch(
  '/rooms/:room_id',
  roomIdValidator,
  updateRoomValidator,
  isHandleByAdminOrStaff,
  roomController.updateRoom
)
roomRouter.delete('/rooms/:room_id', roomIdValidator, isHandleByAdminOrStaff, roomController.deleteRoom)

// Routes cho quản lý resident trong phòng - chỉ admin hoặc staff
roomRouter.post(
  '/rooms/:room_id/residents',
  roomIdValidator,
  addResidentToRoomValidator,
  isHandleByAdminOrStaff,
  roomController.addResidentToRoom
)
roomRouter.delete(
  '/rooms/:room_id/residents',
  roomIdValidator,
  removeResidentFromRoomValidator,
  isHandleByAdminOrStaff,
  roomController.removeResidentFromRoom
)

export default roomRouter
