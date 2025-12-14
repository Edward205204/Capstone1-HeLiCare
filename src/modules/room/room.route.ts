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
import { wrapRequestHandler } from '~/utils/handler'

const roomRouter = Router()

// Tất cả routes đều cần access token
roomRouter.use(accessTokenValidator)

// Routes cho quản lý phòng
// Get rooms - staff cũng có thể access (lấy rooms của institution từ token)
roomRouter.get('/rooms', roomController.getRoomsByInstitution) // Lấy institution_id từ req.user
// Route này phải đặt TRƯỚC /rooms/:room_id để tránh conflict
roomRouter.get('/rooms/available', wrapRequestHandler(roomController.getAvailableRoomsByType))
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

// Routes cho room change requests
// Tạo yêu cầu đổi phòng (family và resident có thể dùng)
roomRouter.post('/room-change-requests', wrapRequestHandler(roomController.createRoomChangeRequest))

// Lấy danh sách room change requests cho family (family có thể dùng)
// Route này phải đặt TRƯỚC /room-change-requests để tránh conflict
roomRouter.get('/room-change-requests/family', wrapRequestHandler(roomController.getRoomChangeRequestsForFamily))

// Lấy danh sách room change requests (chỉ staff/admin)
roomRouter.get(
  '/room-change-requests',
  isHandleByAdminOrStaff,
  wrapRequestHandler(roomController.getRoomChangeRequests)
)

// Staff xác nhận room change request
roomRouter.post(
  '/room-change-requests/:request_id/approve',
  isHandleByAdminOrStaff,
  wrapRequestHandler(roomController.approveRoomChangeRequest)
)

// Staff từ chối room change request
roomRouter.post(
  '/room-change-requests/:request_id/reject',
  isHandleByAdminOrStaff,
  wrapRequestHandler(roomController.rejectRoomChangeRequest)
)

export default roomRouter
