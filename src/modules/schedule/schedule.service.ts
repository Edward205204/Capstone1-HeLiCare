import { PrismaClient, Schedule, ActivityStatus, ScheduleFrequency, ActivityType } from '@prisma/client'
import { CreateScheduleDto, UpdateScheduleDto, GetSchedulesQueryParams, ScheduleResponse, ScheduleStatistics } from './schedule.dto'

const prisma = new PrismaClient()

export class ScheduleService {
  async createSchedule(institution_id: string, data: CreateScheduleDto): Promise<Schedule> {
    return await prisma.schedule.create({
      data: {
        institution_id,
        ...data
      },
      include: {
        activity: {
          select: {
            activity_id: true,
            name: true,
            type: true,
            duration_minutes: true
          }
        },
        resident: {
          select: {
            resident_id: true,
            full_name: true,
            room_id: true
          }
        },
        staff: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true,
                position: true
              }
            }
          }
        },
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        }
      }
    })
  }

  async getSchedulesByInstitution(
    institution_id: string,
    params: GetSchedulesQueryParams = {}
  ): Promise<{ data: ScheduleResponse[]; total: number }> {
    const { 
      take = 10, 
      skip = 0, 
      resident_id, 
      staff_id, 
      activity_id, 
      status, 
      start_date, 
      end_date, 
      frequency, 
      is_recurring, 
      search 
    } = params

    const where: any = {
      institution_id
    }

    if (resident_id) {
      where.resident_id = resident_id
    }

    if (staff_id) {
      where.staff_id = staff_id
    }

    if (activity_id) {
      where.activity_id = activity_id
    }

    if (status) {
      where.status = status
    }

    if (frequency) {
      where.frequency = frequency
    }

    if (is_recurring !== undefined) {
      where.is_recurring = is_recurring
    }

    if (start_date || end_date) {
      where.start_time = {}
      if (start_date) {
        where.start_time.gte = new Date(start_date)
      }
      if (end_date) {
        where.start_time.lte = new Date(end_date)
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [data, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        take,
        skip,
        orderBy: { start_time: 'asc' },
        include: {
          activity: {
            select: {
              activity_id: true,
              name: true,
              type: true,
              duration_minutes: true
            }
          },
          resident: {
            select: {
              resident_id: true,
              full_name: true,
              room_id: true
            }
          },
          staff: {
            select: {
              user_id: true,
              staffProfile: {
                select: {
                  full_name: true,
                  position: true
                }
              }
            }
          },
          institution: {
            select: {
              institution_id: true,
              name: true
            }
          }
        }
      }),
      prisma.schedule.count({ where })
    ])

    return { data, total }
  }

  async getScheduleById(schedule_id: string): Promise<ScheduleResponse | null> {
    return await prisma.schedule.findUnique({
      where: { schedule_id },
      include: {
        activity: {
          select: {
            activity_id: true,
            name: true,
            type: true,
            duration_minutes: true
          }
        },
        resident: {
          select: {
            resident_id: true,
            full_name: true,
            room_id: true
          }
        },
        staff: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true,
                position: true
              }
            }
          }
        },
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        }
      }
    })
  }

  async updateSchedule(schedule_id: string, data: UpdateScheduleDto): Promise<Schedule> {
    return await prisma.schedule.update({
      where: { schedule_id },
      data,
      include: {
        activity: {
          select: {
            activity_id: true,
            name: true,
            type: true,
            duration_minutes: true
          }
        },
        resident: {
          select: {
            resident_id: true,
            full_name: true,
            room_id: true
          }
        },
        staff: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true,
                position: true
              }
            }
          }
        },
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        }
      }
    })
  }

  async deleteSchedule(schedule_id: string): Promise<Schedule> {
    return await prisma.schedule.delete({
      where: { schedule_id }
    })
  }

  async getSchedulesByResident(resident_id: string, take = 10, skip = 0): Promise<{ data: ScheduleResponse[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.schedule.findMany({
        where: { resident_id },
        take,
        skip,
        orderBy: { start_time: 'asc' },
        include: {
          activity: {
            select: {
              activity_id: true,
              name: true,
              type: true,
              duration_minutes: true
            }
          },
          resident: {
            select: {
              resident_id: true,
              full_name: true,
              room_id: true
            }
          },
          staff: {
            select: {
              user_id: true,
              staffProfile: {
                select: {
                  full_name: true,
                  position: true
                }
              }
            }
          },
          institution: {
            select: {
              institution_id: true,
              name: true
            }
          }
        }
      }),
      prisma.schedule.count({ where: { resident_id } })
    ])

    return { data, total }
  }

  async getSchedulesByStaff(staff_id: string, take = 10, skip = 0): Promise<{ data: ScheduleResponse[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.schedule.findMany({
        where: { staff_id },
        take,
        skip,
        orderBy: { start_time: 'asc' },
        include: {
          activity: {
            select: {
              activity_id: true,
              name: true,
              type: true,
              duration_minutes: true
            }
          },
          resident: {
            select: {
              resident_id: true,
              full_name: true,
              room_id: true
            }
          },
          staff: {
            select: {
              user_id: true,
              staffProfile: {
                select: {
                  full_name: true,
                  position: true
                }
              }
            }
          },
          institution: {
            select: {
              institution_id: true,
              name: true
            }
          }
        }
      }),
      prisma.schedule.count({ where: { staff_id } })
    ])

    return { data, total }
  }

  async updateScheduleStatus(schedule_id: string, status: ActivityStatus): Promise<Schedule> {
    return await prisma.schedule.update({
      where: { schedule_id },
      data: { status },
      include: {
        activity: {
          select: {
            activity_id: true,
            name: true,
            type: true,
            duration_minutes: true
          }
        },
        resident: {
          select: {
            resident_id: true,
            full_name: true,
            room_id: true
          }
        },
        staff: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true,
                position: true
              }
            }
          }
        },
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        }
      }
    })
  }

  async getUpcomingSchedules(institution_id: string, days = 7): Promise<ScheduleResponse[]> {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(startDate.getDate() + days)

    return await prisma.schedule.findMany({
      where: {
        institution_id,
        start_time: {
          gte: startDate,
          lte: endDate
        },
        status: 'planned'
      },
      orderBy: { start_time: 'asc' },
      take: 20,
      include: {
        activity: {
          select: {
            activity_id: true,
            name: true,
            type: true,
            duration_minutes: true
          }
        },
        resident: {
          select: {
            resident_id: true,
            full_name: true,
            room_id: true
          }
        },
        staff: {
          select: {
            user_id: true,
            staffProfile: {
              select: {
                full_name: true,
                position: true
              }
            }
          }
        },
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        }
      }
    })
  }

  async getScheduleStatistics(institution_id: string): Promise<ScheduleStatistics> {
    const [total, active, completed, pending, recurring, byFrequency, byActivityType, upcoming] = await Promise.all([
      prisma.schedule.count({
        where: { institution_id }
      }),
      prisma.schedule.count({
        where: { institution_id, status: 'planned' }
      }),
      prisma.schedule.count({
        where: { institution_id, status: 'participated' }
      }),
      prisma.schedule.count({
        where: { institution_id, status: 'planned' }
      }),
      prisma.schedule.count({
        where: { institution_id, is_recurring: true }
      }),
      prisma.schedule.groupBy({
        by: ['frequency'],
        where: { institution_id },
        _count: { frequency: true },
        orderBy: { _count: { frequency: 'desc' } }
      }),
      prisma.schedule.groupBy({
        by: ['activity_id'],
        where: { institution_id },
        _count: { activity_id: true },
        orderBy: { _count: { activity_id: 'desc' } }
      }),
      this.getUpcomingSchedules(institution_id, 7)
    ])

    // Get activity types for the byActivityType result
    const activityIds = byActivityType.map((item) => item.activity_id)
    const activities = await prisma.activity.findMany({
      where: { activity_id: { in: activityIds } },
      select: { activity_id: true, type: true }
    })

    const activityMap = new Map(activities.map((activity) => [activity.activity_id, activity.type]))

    return {
      total_schedules: total,
      active_schedules: active,
      completed_schedules: completed,
      pending_schedules: pending,
      recurring_schedules: recurring,
      schedules_by_frequency: byFrequency.map((item) => ({
        frequency: item.frequency,
        count: item._count.frequency
      })),
      schedules_by_activity_type: byActivityType.map((item) => ({
        activity_type: activityMap.get(item.activity_id) || 'other' as ActivityType,
        count: item._count.activity_id
      })),
      upcoming_schedules: upcoming
    }
  }
}

export const scheduleService = new ScheduleService()
