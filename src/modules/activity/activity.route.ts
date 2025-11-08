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

const activity = Router()

activity.post('/', accessTokenValidator, checkInstitutionAccess, activityController.createActivity)

activity.get('/', accessTokenValidator, checkInstitutionAccess, activityController.getActivities)

activity.get('/types', accessTokenValidator, checkInstitutionAccess, activityController.getActivityTypes)

activity.get('/statistics', accessTokenValidator, checkInstitutionAccess, activityController.getActivityStatistics)

activity.get('/type/:type', accessTokenValidator, checkInstitutionAccess, activityController.getActivitiesByType)

activity.get(
  '/:activity_id',
  accessTokenValidator,
  checkInstitutionAccess,
  checkActivityExists,
  checkActivityOwnership,
  activityController.getActivityById
)

activity.put(
  '/:activity_id',
  accessTokenValidator,
  checkInstitutionAccess,
  checkActivityExists,
  checkActivityOwnership,
  activityController.updateActivity
)

activity.patch(
  '/:activity_id/toggle',
  accessTokenValidator,
  checkInstitutionAccess,
  checkActivityExists,
  checkActivityOwnership,
  activityController.toggleActivityStatus
)

activity.delete(
  '/:activity_id',
  accessTokenValidator,
  checkInstitutionAccess,
  checkActivityExists,
  checkActivityOwnership,
  activityController.deleteActivity
)

export default activity
