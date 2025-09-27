import express from 'express'
import authRouter from './modules/auth/auth.route'
import { defaultErrorHandler } from './common/common.middleware'
import { createServer } from 'http'
import dotenv from 'dotenv'
import cors from 'cors'

dotenv.config()
const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 3000
app.use(cors())
app.use(express.json())
app.use('/auth', authRouter)

app.use(defaultErrorHandler)
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
