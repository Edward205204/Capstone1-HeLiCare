import { PrismaClient, Activity, ActivityType } from '@prisma/client'
import { CreateActivityDto, UpdateActivityDto, GetActivitiesQueryParams } from './activity.dto'

const prisma = new PrismaClient()

export class ActivityService {
  async createActivity(institution_id: string, data: CreateActivityDto): Promise<Activity> {
    return await prisma.activity.create({
      data: {
        institution_id,
        ...data
      }
    })
  }

  async getActivitiesByInstitution(
    institution_id: string,
    params: GetActivitiesQueryParams = {}
  ): Promise<{ data: Activity[]; total: number }> {
    const { take = 10, skip = 0, type, is_active, search } = params

    const where: any = {
      institution_id
    }

    if (type) {
      where.type = type
    }

    if (is_active !== undefined) {
      where.is_active = is_active
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [data, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        take,
        skip,
        orderBy: { created_at: 'desc' }
      }),
      prisma.activity.count({ where })
    ])

    return { data, total }
  }

  async getActivityById(activity_id: string): Promise<Activity | null> {
    return await prisma.activity.findUnique({
      where: { activity_id },
      include: {
        institution: {
          select: {
            name: true,
            institution_id: true
          }
        },
        _count: {
          select: {
            schedules: true,
            careLogs: true
          }
        }
      }
    })
  }

  async updateActivity(activity_id: string, data: UpdateActivityDto): Promise<Activity> {
    return await prisma.activity.update({
      where: { activity_id },
      data
    })
  }

  async deleteActivity(activity_id: string): Promise<Activity> {
    return await prisma.activity.delete({
      where: { activity_id }
    })
  }

  async getActivityTypes(): Promise<{ type: ActivityType; count: number }[]> {
    const result = await prisma.activity.groupBy({
      by: ['type'],
      _count: {
        type: true
      },
      orderBy: {
        _count: {
          type: 'desc'
        }
      }
    })

    return result.map((item) => ({
      type: item.type,
      count: item._count.type
    }))
  }

  async getActivitiesByType(institution_id: string, type: ActivityType): Promise<Activity[]> {
    return await prisma.activity.findMany({
      where: {
        institution_id,
        type,
        is_active: true
      },
      orderBy: { name: 'asc' }
    })
  }

  async toggleActivityStatus(activity_id: string): Promise<Activity> {
    const activity = await prisma.activity.findUnique({
      where: { activity_id }
    })

    if (!activity) {
      throw new Error('Activity not found')
    }

    return await prisma.activity.update({
      where: { activity_id },
      data: {
        is_active: !activity.is_active
      }
    })
  }

  async getActivityStatistics(institution_id: string): Promise<{
    total_activities: number
    active_activities: number
    inactive_activities: number
    activities_by_type: { type: ActivityType; count: number }[]
  }> {
    const [total, active, inactive, byType] = await Promise.all([
      prisma.activity.count({
        where: { institution_id }
      }),
      prisma.activity.count({
        where: { institution_id, is_active: true }
      }),
      prisma.activity.count({
        where: { institution_id, is_active: false }
      }),
      this.getActivityTypes()
    ])

    return {
      total_activities: total,
      active_activities: active,
      inactive_activities: inactive,
      activities_by_type: byType
    }
  }
}

export const activityService = new ActivityService()
