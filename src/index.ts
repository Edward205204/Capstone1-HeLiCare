import express from 'express'
import authRouter from './modules/auth/auth.route'
import { defaultErrorHandler } from './common/common.middleware'
import { createServer } from 'http'
import cors from 'cors'
import institutionRouter from './modules/institution/institution.route'
import roomRouter from './modules/room/room.route'
import visitRouter from './modules/visit/visit.route'
import { env } from './utils/dot.env'

const app = express()
const httpServer = createServer(app)
const PORT = env.PORT || 3000
app.use(cors())
app.use(express.json())
app.use('/auth', authRouter)
app.use('/institution', institutionRouter)
app.use('/api', roomRouter)
app.use('/api', visitRouter)

app.use(defaultErrorHandler)
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
