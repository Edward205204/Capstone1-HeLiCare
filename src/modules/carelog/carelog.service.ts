import { PrismaClient, CareLog, CareLogType, CareTaskStatus } from '@prisma/client'
import { CreateCareLogDto, UpdateCareLogDto, GetCareLogsQueryParams, CareLogResponse } from './carelog.dto'

const prisma = new PrismaClient()

export class CareLogService {
  async createCareLog(staff_id: string, institution_id: string, data: CreateCareLogDto): Promise<CareLog> {
    return await prisma.careLog.create({
      data: {
        staff_id,
        institution_id,
        ...data
      },
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true
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
        activity: {
          select: {
            activity_id: true,
            name: true,
            type: true
          }
        },
        schedule: {
          select: {
            schedule_id: true,
            title: true
          }
        }
      }
    })
  }

  async getCareLogsByInstitution(
    institution_id: string,
    params: GetCareLogsQueryParams = {}
  ): Promise<{ data: CareLogResponse[]; total: number }> {
    const { take = 10, skip = 0, resident_id, staff_id, type, status, start_date, end_date, search } = params

    const where: any = {
      institution_id
    }

    if (resident_id) {
      where.resident_id = resident_id
    }

    if (staff_id) {
      where.staff_id = staff_id
    }

    if (type) {
      where.type = type
    }

    if (status) {
      where.status = status
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
      prisma.careLog.findMany({
        where,
        take,
        skip,
        orderBy: { start_time: 'desc' },
        include: {
          resident: {
            select: {
              resident_id: true,
              full_name: true
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
          activity: {
            select: {
              activity_id: true,
              name: true,
              type: true
            }
          },
          schedule: {
            select: {
              schedule_id: true,
              title: true
            }
          }
        }
      }),
      prisma.careLog.count({ where })
    ])

    return { data, total }
  }

  async getCareLogById(care_log_id: string): Promise<CareLogResponse | null> {
    return await prisma.careLog.findUnique({
      where: { care_log_id },
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true
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
        activity: {
          select: {
            activity_id: true,
            name: true,
            type: true
          }
        },
        schedule: {
          select: {
            schedule_id: true,
            title: true
          }
        }
      }
    })
  }

  async updateCareLog(care_log_id: string, data: UpdateCareLogDto): Promise<CareLog> {
    return await prisma.careLog.update({
      where: { care_log_id },
      data,
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true
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
        activity: {
          select: {
            activity_id: true,
            name: true,
            type: true
          }
        },
        schedule: {
          select: {
            schedule_id: true,
            title: true
          }
        }
      }
    })
  }

  async deleteCareLog(care_log_id: string): Promise<CareLog> {
    return await prisma.careLog.delete({
      where: { care_log_id }
    })
  }

  async getCareLogsByResident(
    resident_id: string,
    take = 10,
    skip = 0
  ): Promise<{ data: CareLogResponse[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.careLog.findMany({
        where: { resident_id },
        take,
        skip,
        orderBy: { start_time: 'desc' },
        include: {
          resident: {
            select: {
              resident_id: true,
              full_name: true
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
          activity: {
            select: {
              activity_id: true,
              name: true,
              type: true
            }
          },
          schedule: {
            select: {
              schedule_id: true,
              title: true
            }
          }
        }
      }),
      prisma.careLog.count({ where: { resident_id } })
    ])

    return { data, total }
  }

  async getCareLogsByStaff(staff_id: string, take = 10, skip = 0): Promise<{ data: CareLogResponse[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.careLog.findMany({
        where: { staff_id },
        take,
        skip,
        orderBy: { start_time: 'desc' },
        include: {
          resident: {
            select: {
              resident_id: true,
              full_name: true
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
          activity: {
            select: {
              activity_id: true,
              name: true,
              type: true
            }
          },
          schedule: {
            select: {
              schedule_id: true,
              title: true
            }
          }
        }
      }),
      prisma.careLog.count({ where: { staff_id } })
    ])

    return { data, total }
  }

  async updateCareLogStatus(care_log_id: string, status: CareTaskStatus): Promise<CareLog> {
    return await prisma.careLog.update({
      where: { care_log_id },
      data: { status },
      include: {
        resident: {
          select: {
            resident_id: true,
            full_name: true
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
        activity: {
          select: {
            activity_id: true,
            name: true,
            type: true
          }
        },
        schedule: {
          select: {
            schedule_id: true,
            title: true
          }
        }
      }
    })
  }

  async getCareLogStatistics(institution_id: string): Promise<{
    total_care_logs: number
    completed_care_logs: number
    pending_care_logs: number
    in_progress_care_logs: number
    care_logs_by_type: { type: CareLogType; count: number }[]
    care_logs_by_staff: { staff_name: string; count: number }[]
  }> {
    const [total, completed, pending, inProgress, byType, byStaff] = await Promise.all([
      prisma.careLog.count({
        where: { institution_id }
      }),
      prisma.careLog.count({
        where: { institution_id, status: 'completed' }
      }),
      prisma.careLog.count({
        where: { institution_id, status: 'pending' }
      }),
      prisma.careLog.count({
        where: { institution_id, status: 'in_progress' }
      }),
      prisma.careLog.groupBy({
        by: ['type'],
        where: { institution_id },
        _count: { type: true },
        orderBy: { _count: { type: 'desc' } }
      }),
      prisma.careLog.groupBy({
        by: ['staff_id'],
        where: { institution_id },
        _count: { staff_id: true },
        orderBy: { _count: { staff_id: 'desc' } }
      })
    ])

    // Get staff names for the byStaff result
    const staffIds = byStaff.map((item) => item.staff_id)
    const staffProfiles = await prisma.staffProfile.findMany({
      where: { user_id: { in: staffIds } },
      select: { user_id: true, full_name: true }
    })

    const staffMap = new Map(staffProfiles.map((staff) => [staff.user_id, staff.full_name]))

    return {
      total_care_logs: total,
      completed_care_logs: completed,
      pending_care_logs: pending,
      in_progress_care_logs: inProgress,
      care_logs_by_type: byType.map((item) => ({
        type: item.type,
        count: item._count.type
      })),
      care_logs_by_staff: byStaff.map((item) => ({
        staff_name: staffMap.get(item.staff_id) || 'Unknown',
        count: item._count.staff_id
      }))
    }
  }
}

export const careLogService = new CareLogService()
