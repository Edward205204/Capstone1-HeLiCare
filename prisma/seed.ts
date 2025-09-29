import { hashPassword, verifyPassword } from '../src/utils/hash'
import { UserRole, UserStatus } from '@prisma/client'
import { prisma } from './../src/utils/db'
import { env } from '../src/utils/dot.env'

export async function main() {
  // 1. Xóa tất cả super users
  await prisma.user.deleteMany({
    where: {
      role: UserRole.PlatformSuperAdmin
    }
  })

  console.log('Deleted all PlatformSuperAdmin roles')

  const superUsers = env.PLATFORM_SUPER_ADMIN_EMAIL?.split(',')
  if (!superUsers) {
    throw new Error('PLATFORM_SUPER_ADMIN_EMAIL is not set')
  }

  const hashedPassword = await hashPassword(env.DEFAULT_PASSWORD || '123456')

  for (const email of superUsers) {
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword.password,
        role: UserRole.PlatformSuperAdmin,
        status: UserStatus.active
      }
    })
    console.log(email)
  }

  console.log('Seeded PlatformSuperAdmin:', superUsers)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
