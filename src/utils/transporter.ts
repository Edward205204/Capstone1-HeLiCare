import nodemailer from 'nodemailer'
import { env } from './dot.env'

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.EMAIL_USER,
    pass: env.APP_PASSWORD
  }
})
