import express from 'express'
import authRouter from './modules/auth/auth.route'
import { defaultErrorHandler } from './common/common.middleware'
import { createServer } from 'http'
import cors from 'cors'
import institutionRouter from './modules/institution/institution.route'
import roomRouter from './modules/room/room.route'
import visitRouter from './modules/visit/visit.route'
import activityRouter from './modules/activity/activity.route'
import careLogRouter from './modules/carelog/carelog.route'
import scheduleRouter from './modules/schedule/schedule.route'
import residentRouter from './modules/resident/resident.route'
import assessmentRouter from './modules/assessment/assessment.route'
import postRouter from './modules/post/post.route'
import mediaRouter from './modules/media/media.route'
import { env } from './utils/dot.env'
import { initFolder } from './utils/file'
import staffRouter from './modules/staff/staff.route'
import feedbackRouter from './modules/feedback/feedback.route'
import notificationCenterRouter from './modules/notification-center/notification-center.route'
import menuPlannerRouter from './modules/menu-planner/menu-planner.route'
import medicationCarePlanRouter from './modules/medication-careplan/medication-careplan.route'
import eventRouter from './modules/event/event.route'
import serviceContractRouter from './modules/service-contract/service-contract.route'
import paymentRouter from './modules/payment/payment.route'
const app = express()
const httpServer = createServer(app)
const PORT = env.PORT || 3000

// Initialize upload folders
initFolder()

app.use(cors())
app.use(express.json())

// Trust proxy để lấy đúng protocol và host từ request
app.set('trust proxy', true)
app.use('/auth', authRouter)
app.use('/institution', institutionRouter)
app.use('/api/visits', visitRouter)
app.use('/api/rooms', roomRouter)
app.use('/api/activities', activityRouter)
app.use('/api/carelogs', careLogRouter)
app.use('/api/schedules', scheduleRouter)
app.use('/api/residents', residentRouter)
app.use('/api/assessments', assessmentRouter)
app.use('/api/posts', postRouter)
app.use('/api/media', mediaRouter)
app.use('/api/staff', staffRouter)
app.use('/api/feedbacks', feedbackRouter)
app.use('/api/notifications', notificationCenterRouter)
app.use('/api/menu-planner', menuPlannerRouter)
app.use('/api/medication-careplan', medicationCarePlanRouter)
app.use('/api/events', eventRouter)
app.use('/api/service-contracts', serviceContractRouter)
app.use('/api/payments', paymentRouter)
app.use(defaultErrorHandler)
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
