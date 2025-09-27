import { hashPassword } from '../src/utils/hash'
import { UserRole } from '@prisma/client'
import { prisma } from './../src/utils/db'

async function main() {
  // 1. Xóa tất cả super users
  await prisma.user.deleteMany({
    where: {
      role: UserRole.PlatformSuperAdmin
    }
  })

  console.log('Deleted all PlatformSuperAdmin roles')

  const superUsers = process.env.PLATFORM_SUPER_ADMIN_EMAIL?.split(',')
  if (!superUsers) {
    throw new Error('PLATFORM_SUPER_ADMIN_EMAIL is not set')
  }

  const hashedPassword = await hashPassword(process.env.DEFAULT_PASSWORD || '123456')
  for (const email of superUsers) {
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword.password,
        role: UserRole.PlatformSuperAdmin
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
