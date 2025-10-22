import { Router } from 'express'
import { activityController } from './activity.controller'
// import {
//   createActivitySchema,
//   updateActivitySchema,
//   getActivityByIdSchema,
//   getActivitiesSchema
// } from './activity.schema'
import { checkActivityOwnership, checkActivityExists, checkInstitutionAccess } from './activity.middleware'
import { accessTokenValidator } from '~/modules/auth/auth.middleware'

const router = Router()

// Apply authentication middleware to all routes
router.use(accessTokenValidator)

// Apply institution access check to all routes
router.use(checkInstitutionAccess)

// POST /api/activities - Create new activity
router.post('/', activityController.createActivity)

// GET /api/activities - Get all activities with pagination and filters
router.get('/', activityController.getActivities)

// GET /api/activities/types - Get activity types with counts
router.get('/types', activityController.getActivityTypes)

// GET /api/activities/statistics - Get activity statistics
router.get('/statistics', activityController.getActivityStatistics)

// GET /api/activities/type/:type - Get activities by type
router.get('/type/:type', activityController.getActivitiesByType)

// GET /api/activities/:activity_id - Get activity by ID
router.get('/:activity_id', checkActivityExists, checkActivityOwnership, activityController.getActivityById)

// PUT /api/activities/:activity_id - Update activity
router.put('/:activity_id', checkActivityExists, checkActivityOwnership, activityController.updateActivity)

// PATCH /api/activities/:activity_id/toggle - Toggle activity status
router.patch(
  '/:activity_id/toggle',
  checkActivityExists,
  checkActivityOwnership,
  activityController.toggleActivityStatus
)

// DELETE /api/activities/:activity_id - Delete activity
router.delete('/:activity_id', checkActivityExists, checkActivityOwnership, activityController.deleteActivity)

export default router
