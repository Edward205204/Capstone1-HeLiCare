import { prisma } from '~/utils/db'

class NotificationCenterService {
  async getLastSeen(user_id: string) {
    const state = await prisma.familyNotificationState.findUnique({
      where: { user_id }
    })
    return state?.last_seen_at || null
  }

  async markAllAsRead(user_id: string, now: Date = new Date()) {
    const state = await prisma.familyNotificationState.upsert({
      where: { user_id },
      update: { last_seen_at: now },
      create: {
        user_id,
        last_seen_at: now
      }
    })
    return state
  }

  async getReadNotificationIds(user_id: string): Promise<string[]> {
    const rows = await prisma.familyNotificationRead.findMany({
      where: { user_id },
      select: { notification_id: true }
    })
    return rows.map((r: { notification_id: string }) => r.notification_id)
  }

  async markNotificationsRead(user_id: string, ids: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean)
    if (uniqueIds.length === 0) return

    await prisma.familyNotificationRead.createMany({
      data: uniqueIds.map((id) => ({
        user_id,
        notification_id: id
      })),
      skipDuplicates: true
    })
  }
}

export const notificationCenterService = new NotificationCenterService()
