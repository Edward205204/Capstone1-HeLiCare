import { Prisma, BillingCycle } from '@prisma/client'
import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  CreateServiceContractReqBody,
  UpdateServiceContractReqBody,
  ServiceContractResponse,
  GetServiceContractsQuery,
  ServiceContractListResponse
} from './service-contract.dto'
import { commonService } from '~/common/common.service'

class ServiceContractService {
  // Tạo hợp đồng dịch vụ mới
  createServiceContract = async (
    institution_id: string,
    data: CreateServiceContractReqBody
  ): Promise<ServiceContractResponse> => {
    const { resident_id, billing_cycle, amount, start_date, next_billing_date } = data

    const resident = await prisma.resident.findFirst({
      where: {
        resident_id,
        institution_id
      },
      include: {
        room: {
          select: {
            room_id: true,
            room_number: true
          }
        }
      }
    })

    if (!resident) {
      throw new ErrorWithStatus({
        message: 'Resident not found or does not belong to this institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Kiểm tra xem resident đã có hợp đồng active chưa
    const existingContract = await prisma.serviceContract.findFirst({
      where: {
        resident_id,
        is_active: true
      }
    })

    if (existingContract) {
      throw new ErrorWithStatus({
        message: 'Resident already has an active service contract. Please deactivate the existing contract first.',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Validate dates
    const startDate = start_date ? new Date(start_date) : new Date()
    const nextBillingDate = new Date(next_billing_date)

    if (nextBillingDate <= startDate) {
      throw new ErrorWithStatus({
        message: 'Next billing date must be after start date',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Validate amount
    if (amount <= 0) {
      throw new ErrorWithStatus({
        message: 'Amount must be greater than 0',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const contract = await prisma.serviceContract.create({
      data: {
        resident_id,
        institution_id,
        billing_cycle,
        amount,
        start_date: startDate,
        next_billing_date: nextBillingDate,
        is_active: true
      },
      include: {
        resident: {
          include: {
            room: {
              select: {
                room_id: true,
                room_number: true
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

    return this.formatServiceContractResponse(contract)
  }

  // Lấy danh sách hợp đồng
  getServiceContracts = async (params: GetServiceContractsQuery): Promise<ServiceContractListResponse> => {
    const { resident_id, institution_id, is_active, page, limit } = params

    const where: Prisma.ServiceContractWhereInput = {}

    if (resident_id) {
      where.resident_id = resident_id
    }

    if (institution_id) {
      where.institution_id = institution_id
    }

    if (is_active !== undefined) {
      where.is_active = is_active
    }

    const include = {
      resident: {
        include: {
          room: {
            select: {
              room_id: true,
              room_number: true
            }
          }
        }
      },
      institution: {
        select: {
          institution_id: true,
          name: true
        }
      },
      payments: {
        take: 10,
        orderBy: {
          created_at: Prisma.SortOrder.desc
        },
        select: {
          payment_id: true,
          amount: true,
          status: true,
          payment_method: true,
          created_at: true
        }
      }
    }

    if (!page || !limit) {
      const contracts = await prisma.serviceContract.findMany({
        where,
        include,
        orderBy: {
          created_at: 'desc'
        }
      })

      return {
        contracts: contracts.map(this.formatServiceContractResponse)
      }
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const safePage = Math.max(page, 1)
    const skip = (safePage - 1) * safeLimit

    const [total, contracts] = await prisma.$transaction([
      prisma.serviceContract.count({ where }),
      prisma.serviceContract.findMany({
        where,
        include,
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: safeLimit
      })
    ])

    return {
      contracts: contracts.map(this.formatServiceContractResponse),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit))
      }
    }
  }

  // Lấy hợp đồng theo ID
  getServiceContractById = async (contract_id: string): Promise<ServiceContractResponse> => {
    const contract = await prisma.serviceContract.findUnique({
      where: { contract_id },
      include: {
        resident: {
          include: {
            room: {
              select: {
                room_id: true,
                room_number: true
              }
            }
          }
        },
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        },
        payments: {
          orderBy: {
            created_at: 'desc'
          },
          select: {
            payment_id: true,
            amount: true,
            status: true,
            payment_method: true,
            created_at: true
          }
        }
      }
    })

    if (!contract) {
      throw new ErrorWithStatus({
        message: 'Service contract not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return this.formatServiceContractResponse(contract)
  }

  // Lấy hợp đồng của resident
  getServiceContractByResidentId = async (resident_id: string): Promise<ServiceContractResponse | null> => {
    const contract = await prisma.serviceContract.findFirst({
      where: {
        resident_id,
        is_active: true
      },
      include: {
        resident: {
          include: {
            room: {
              select: {
                room_id: true,
                room_number: true
              }
            }
          }
        },
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        },
        payments: {
          take: 10,
          orderBy: {
            created_at: 'desc' as const
          },
          select: {
            payment_id: true,
            amount: true,
            status: true,
            payment_method: true,
            created_at: true
          }
        }
      }
    })

    return contract ? this.formatServiceContractResponse(contract) : null
  }

  // Lấy hợp đồng của Family user (qua resident links)
  getServiceContractsByFamily = async (family_user_id: string): Promise<ServiceContractResponse[]> => {
    // Lấy danh sách residents mà family user có quyền truy cập
    const links = await prisma.familyResidentLink.findMany({
      where: {
        family_user_id,
        status: 'active'
      },
      select: {
        resident_id: true
      }
    })

    const residentIds = links.map((link) => link.resident_id)

    if (residentIds.length === 0) {
      return []
    }

    const contracts = await prisma.serviceContract.findMany({
      where: {
        resident_id: {
          in: residentIds
        },
        is_active: true
      },
      include: {
        resident: {
          include: {
            room: {
              select: {
                room_id: true,
                room_number: true
              }
            }
          }
        },
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        },
        payments: {
          take: 10,
          orderBy: {
            created_at: 'desc' as const
          },
          select: {
            payment_id: true,
            amount: true,
            status: true,
            payment_method: true,
            created_at: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return contracts.map(this.formatServiceContractResponse)
  }

  // Cập nhật hợp đồng
  updateServiceContract = async (
    contract_id: string,
    institution_id: string,
    data: UpdateServiceContractReqBody
  ): Promise<ServiceContractResponse> => {
    // Kiểm tra contract tồn tại và thuộc institution
    const existingContract = await prisma.serviceContract.findFirst({
      where: {
        contract_id,
        institution_id
      }
    })

    if (!existingContract) {
      throw new ErrorWithStatus({
        message: 'Service contract not found or does not belong to this institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Validate dates nếu có
    const updateData: Prisma.ServiceContractUpdateInput = {}

    if (data.billing_cycle !== undefined) {
      updateData.billing_cycle = data.billing_cycle
    }

    if (data.amount !== undefined) {
      if (data.amount <= 0) {
        throw new ErrorWithStatus({
          message: 'Amount must be greater than 0',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
      updateData.amount = data.amount
    }

    if (data.next_billing_date !== undefined) {
      const nextBillingDate = new Date(data.next_billing_date)
      if (nextBillingDate <= existingContract.start_date) {
        throw new ErrorWithStatus({
          message: 'Next billing date must be after start date',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
      updateData.next_billing_date = nextBillingDate
    }

    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active
    }

    const contract = await prisma.serviceContract.update({
      where: { contract_id },
      data: updateData,
      include: {
        resident: {
          include: {
            room: {
              select: {
                room_id: true,
                room_number: true
              }
            }
          }
        },
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        },
        payments: {
          take: 10,
          orderBy: {
            created_at: 'desc' as const
          },
          select: {
            payment_id: true,
            amount: true,
            status: true,
            payment_method: true,
            created_at: true
          }
        }
      }
    })

    return this.formatServiceContractResponse(contract)
  }

  // Xóa/hủy hợp đồng (soft delete bằng cách set is_active = false)
  deleteServiceContract = async (contract_id: string, institution_id: string): Promise<void> => {
    const contract = await prisma.serviceContract.findFirst({
      where: {
        contract_id,
        institution_id
      }
    })

    if (!contract) {
      throw new ErrorWithStatus({
        message: 'Service contract not found or does not belong to this institution',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Kiểm tra xem có payment pending không
    const pendingPayment = await prisma.payment.findFirst({
      where: {
        contract_id,
        status: 'PENDING'
      }
    })

    if (pendingPayment) {
      throw new ErrorWithStatus({
        message:
          'Cannot delete service contract with pending payments. Please cancel or complete pending payments first.',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    await prisma.serviceContract.update({
      where: { contract_id },
      data: {
        is_active: false
      }
    })
  }

  // Tính toán next_billing_date dựa trên billing_cycle
  calculateNextBillingDate = (currentDate: Date, billingCycle: BillingCycle): Date => {
    const nextDate = new Date(currentDate)

    if (billingCycle === BillingCycle.MONTHLY) {
      nextDate.setMonth(nextDate.getMonth() + 1)
      // Set về ngày đầu tháng
      nextDate.setDate(1)
    } else if (billingCycle === BillingCycle.YEARLY) {
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      // Set về ngày đầu năm
      nextDate.setMonth(0)
      nextDate.setDate(1)
    }

    return nextDate
  }

  // Format response
  private formatServiceContractResponse = (contract: any): ServiceContractResponse => {
    return {
      contract_id: contract.contract_id,
      resident_id: contract.resident_id,
      institution_id: contract.institution_id,
      billing_cycle: contract.billing_cycle,
      amount: contract.amount,
      start_date: contract.start_date.toISOString(),
      next_billing_date: contract.next_billing_date.toISOString(),
      is_active: contract.is_active,
      created_at: contract.created_at.toISOString(),
      updated_at: contract.updated_at.toISOString(),
      resident: contract.resident
        ? {
            resident_id: contract.resident.resident_id,
            full_name: contract.resident.full_name,
            room: contract.resident.room
              ? {
                  room_id: contract.resident.room.room_id,
                  room_number: contract.resident.room.room_number
                }
              : null
          }
        : undefined,
      institution: contract.institution
        ? {
            institution_id: contract.institution.institution_id,
            name: contract.institution.name
          }
        : undefined,
      payments: contract.payments
        ? contract.payments.map((p: any) => ({
            payment_id: p.payment_id,
            amount: p.amount,
            status: p.status,
            payment_method: p.payment_method,
            created_at: p.created_at.toISOString()
          }))
        : undefined
    }
  }
}

export const serviceContractService = new ServiceContractService()
