import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'
import {
  createAdminValidator,
  createRootAdminValidator,
  createStaffForInstitutionValidator,
  verifyAdminInviteTokenValidator,
  verifyRootAdminInviteTokenValidator,
  verifyStaffInviteTokenValidator
} from './staff.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { staffController } from './staff.controller'

const staffRouter = Router()
/**
 * @description Create staff for institution
 * @method POST
 * @path /auth/create-staff-for-institution
 * @body {
 *   avatar: string,          // Optional avatar URL
 *   email: string,            // Staff email (must be unique)
 *   full_name: string,        // Staff full name
 *   phone: string,            // Staff phone number
 *   hire_date: string,        // Date of hire
 *   position: string,         // Staff position (enum)
 *   notes: string,            // Optional notes
 *   institution_id: string    // ID of the institution
 * }
 * @response { message: string }
 */

staffRouter.post(
  '/create-staff-for-institution',
  accessTokenValidator,
  createStaffForInstitutionValidator,
  wrapRequestHandler(staffController.createStaffForInstitution)
)

/**
 * @description Upload staff avatar and receive streaming URL
 * @method POST
 * @path /auth/upload-staff-avatar
 * @body { image: File } // multipart/form-data with field name "image"
 * @response { message: string, data: { url: string, type: string } }
 */
staffRouter.post('/upload-staff-avatar', wrapRequestHandler(staffController.uploadStaffAvatar))

/**
 * @description Staff vào link từ email nhập email, password và confirm password
 * @method POST
 * @path /auth/verify-staff-invite-and-reset-password
 * @body {email: string, password: string, staff_invite_token: string}
 * @response {message: string}
 */
staffRouter.post(
  '/verify-staff-invite-and-reset-password',
  verifyStaffInviteTokenValidator,
  wrapRequestHandler(staffController.verifyStaffInviteAndResetPassword)
)

/**
 * @description Create root admin
 * @method POST
 * @path /auth/create-root-admin
 * @body {email: string, institution_id: string}
 * @response {message: string}
 */
staffRouter.post(
  '/create-root-admin',
  accessTokenValidator,
  createRootAdminValidator,
  wrapRequestHandler(staffController.createRootAdmin)
)

/**
 * @description Verify root admin invite and reset password
 * @method POST
 * @path /auth/verify-root-admin-invite-and-reset-password
 * @body {email: string, password: string, root_admin_invite_token: string}
 * @response {message: string}
 */
staffRouter.post(
  '/verify-root-admin-invite-and-reset-password',
  verifyRootAdminInviteTokenValidator,
  wrapRequestHandler(staffController.verifyRootAdminInviteAndResetPassword)
)

/**
 * @description Create admin by root admin
 * @method POST
 * @path /auth/create-admin
 * @body {email: string}
 * @header {Authorization: Bearer <access_token>}
 * @response {message: string}
 */
staffRouter.post(
  '/create-admin',
  accessTokenValidator,
  createAdminValidator,
  wrapRequestHandler(staffController.createAdmin)
)

/**
 * @description Verify admin invite and reset password
 * @method POST
 * @path /auth/verify-admin-invite-and-reset-password
 * @body {email: string, password: string, confirm_password: string, admin_invite_token: string}
 * @response {message: string}
 */
staffRouter.post(
  '/verify-admin-invite-and-reset-password',
  verifyAdminInviteTokenValidator,
  wrapRequestHandler(staffController.verifyAdminInviteAndResetPassword)
)

/**
 * @description Get staff list by institution (from token)
 * @method GET
 * @path /auth/staff
 * @header {Authorization: Bearer <access_token>}
 * @response {message: string, data: Array<{user_id: string, email: string, role: string, full_name: string, phone: string, position: string, hire_date: Date}>}
 */
staffRouter.get('/staff', accessTokenValidator, wrapRequestHandler(staffController.getStaffList))

/**
 * @description Get staff detail by ID
 * @method GET
 * @path /staff/:staff_id
 */
staffRouter.get('/:staff_id', accessTokenValidator, wrapRequestHandler(staffController.getStaffById))

/**
 * @description Get residents assigned to staff
 * @method GET
 * @path /staff/:staff_id/residents
 */
staffRouter.get('/:staff_id/residents', accessTokenValidator, wrapRequestHandler(staffController.getStaffResidents))

/**
 * @description Get tasks assigned to staff
 * @method GET
 * @path /staff/:staff_id/tasks
 */
staffRouter.get('/:staff_id/tasks', accessTokenValidator, wrapRequestHandler(staffController.getStaffTasks))

/**
 * @description Assign task to staff
 * @method POST
 * @path /staff/:staff_id/assign-task
 */
staffRouter.post('/:staff_id/assign-task', accessTokenValidator, wrapRequestHandler(staffController.assignTaskToStaff))

/**
 * @description Mark task as done
 * @method PATCH
 * @path /staff/tasks/:task_id/done
 */
staffRouter.patch('/tasks/:task_id/done', accessTokenValidator, wrapRequestHandler(staffController.markTaskDone))

/**
 * @description Get staff performance
 * @method GET
 * @path /staff/:staff_id/performance?month=YYYY-MM
 */
staffRouter.get('/:staff_id/performance', accessTokenValidator, wrapRequestHandler(staffController.getStaffPerformance))

/**
 * @description Create incident report
 * @method POST
 * @path /staff/incident
 */
staffRouter.post('/incident', accessTokenValidator, wrapRequestHandler(staffController.createIncident))

/**
 * @description Get incidents
 * @method GET
 * @path /staff/incidents
 */
staffRouter.get('/incidents', accessTokenValidator, wrapRequestHandler(staffController.getIncidents))

/**
 * @description Get SOS alerts
 * @method GET
 * @path /staff/incidents/alerts
 */
staffRouter.get('/incidents/alerts', accessTokenValidator, wrapRequestHandler(staffController.getSOSAlerts))

/**
 * @description Update alert status
 * @method PATCH
 * @path /staff/incidents/alerts/:alert_id/status
 */
staffRouter.patch(
  '/incidents/alerts/:alert_id/status',
  accessTokenValidator,
  wrapRequestHandler(staffController.updateAlertStatus)
)

/**
 * @description Get abnormal vital signs for a resident
 * @method GET
 * @path /staff/incidents/residents/:resident_id/abnormal-vitals
 */
staffRouter.get(
  '/incidents/residents/:resident_id/abnormal-vitals',
  accessTokenValidator,
  wrapRequestHandler(staffController.getAbnormalVitals)
)

/**
 * @description Create incident report
 * @method POST
 * @path /staff/incidents/reports
 */
staffRouter.post('/incidents/reports', accessTokenValidator, wrapRequestHandler(staffController.createIncidentReport))

/**
 * @description Get incident reports
 * @method GET
 * @path /staff/incidents/reports
 */
staffRouter.get('/incidents/reports', accessTokenValidator, wrapRequestHandler(staffController.getIncidentReports))

export default staffRouter
