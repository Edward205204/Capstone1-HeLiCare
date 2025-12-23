import bcrypt from 'bcrypt'
import { env } from './dot.env'

const HASH_PASSWORD_SECRET_KEY = env.PASSWORD_PEPPER || 'default_pepper'
export async function hashPassword(password: string): Promise<{ password: string }> {
  try {
    const passwordWithHash = password + HASH_PASSWORD_SECRET_KEY
    const hashPassword = await bcrypt.hash(passwordWithHash, 10)
    return { password: hashPassword }
  } catch (error) {
    throw new Error('Error hashing password: ' + error)
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordWithHash = password + HASH_PASSWORD_SECRET_KEY
  console.log(passwordWithHash)
  return bcrypt.compare(passwordWithHash, hash)
}
