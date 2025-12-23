import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'

/**
 * Service quản lý tài khoản ngân hàng mock và giao dịch
 * Mỗi user (Family/Resident) sẽ có 1 tài khoản với số dư mặc định 100 triệu VND
 */
class DBMAccountService {
  /**
   * Tạo tài khoản mock cho user (tự động khi user được tạo)
   * @param user_id - ID của user
   * @returns Tài khoản đã tạo
   */
  createAccountForUser = async (user_id: string) => {
    // Kiểm tra xem user đã có tài khoản chưa
    const existingAccount = await prisma.dBM_UserAccount.findUnique({
      where: { user_id },
      include: {
        user: {
          select: {
            email: true,
            role: true
          }
        }
      }
    })

    if (existingAccount) {
      return existingAccount
    }

    // Tạo tài khoản mới với số dư mặc định 100 triệu VND
    const account = await prisma.dBM_UserAccount.create({
      data: {
        user_id,
        balance: 100000000, // 100 triệu VND
        currency: 'VND',
        status: 'active',
        bank_name: 'NCB'
      },
      include: {
        user: {
          select: {
            email: true,
            role: true
          }
        }
      }
    })

    return account
  }

  /**
   * Lấy thông tin tài khoản của user
   * @param user_id - ID của user
   * @returns Thông tin tài khoản
   */
  getAccountByUserId = async (user_id: string) => {
    let account = await prisma.dBM_UserAccount.findUnique({
      where: { user_id },
      include: {
        user: {
          select: {
            email: true,
            role: true
          }
        }
      }
    })

    // Nếu chưa có tài khoản, tạo mới
    if (!account) {
      account = await this.createAccountForUser(user_id)
    }

    // TypeScript không thể infer được account không null sau if check
    // Nên cần assert hoặc return trực tiếp
    if (!account) {
      throw new Error('Failed to create account')
    }

    return account
  }

  /**
   * Kiểm tra số dư có đủ để thanh toán không
   * @param user_id - ID của user
   * @param amount - Số tiền cần thanh toán
   * @returns true nếu đủ tiền
   */
  checkBalance = async (user_id: string, amount: number): Promise<boolean> => {
    const account = await this.getAccountByUserId(user_id)
    if (!account) {
      return false
    }
    return account.balance >= amount
  }

  /**
   * Trừ tiền từ tài khoản (debit)
   * @param user_id - ID của user
   * @param amount - Số tiền cần trừ
   * @param description - Mô tả giao dịch
   * @param payment_id - ID của payment (nếu có)
   * @param reference_code - Mã tham chiếu (vnpay_order_id, etc.)
   * @returns Transaction history record
   */
  debitAccount = async (
    user_id: string,
    amount: number,
    description: string,
    payment_id?: string,
    reference_code?: string
  ) => {
    const account = await this.getAccountByUserId(user_id)

    if (!account) {
      throw new ErrorWithStatus({
        message: 'Tài khoản không tồn tại',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Kiểm tra số dư
    if (account.balance < amount) {
      throw new ErrorWithStatus({
        message: 'Số dư tài khoản không đủ để thực hiện giao dịch',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Kiểm tra trạng thái tài khoản
    if (account.status !== 'active') {
      throw new ErrorWithStatus({
        message: 'Tài khoản không ở trạng thái hoạt động',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const balanceBefore = account.balance
    const balanceAfter = balanceBefore - amount

    // Thực hiện trừ tiền trong transaction để đảm bảo tính nhất quán
    const result = await prisma.$transaction(async (tx) => {
      // Cập nhật số dư
      const updatedAccount = await tx.dBM_UserAccount.update({
        where: { account_id: account.account_id },
        data: { balance: balanceAfter }
      })

      // Tạo lịch sử giao dịch
      const transaction = await tx.dBM_TransactionHistory.create({
        data: {
          account_id: account.account_id,
          payment_id,
          transaction_type: 'debit',
          amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description,
          reference_code,
          status: 'completed'
        }
      })

      return { account: updatedAccount, transaction }
    })

    return result.transaction
  }

  /**
   * Cộng tiền vào tài khoản (credit) - dùng cho hoàn tiền
   * @param user_id - ID của user
   * @param amount - Số tiền cần cộng
   * @param description - Mô tả giao dịch
   * @param payment_id - ID của payment (nếu có)
   * @param reference_code - Mã tham chiếu
   * @returns Transaction history record
   */
  creditAccount = async (
    user_id: string,
    amount: number,
    description: string,
    payment_id?: string,
    reference_code?: string
  ) => {
    const account = await this.getAccountByUserId(user_id)

    if (!account) {
      throw new ErrorWithStatus({
        message: 'Tài khoản không tồn tại',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Kiểm tra trạng thái tài khoản
    if (account.status !== 'active') {
      throw new ErrorWithStatus({
        message: 'Tài khoản không ở trạng thái hoạt động',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const balanceBefore = account.balance
    const balanceAfter = balanceBefore + amount

    // Thực hiện cộng tiền trong transaction
    const result = await prisma.$transaction(async (tx) => {
      // Cập nhật số dư
      const updatedAccount = await tx.dBM_UserAccount.update({
        where: { account_id: account.account_id },
        data: { balance: balanceAfter }
      })

      // Tạo lịch sử giao dịch
      const transaction = await tx.dBM_TransactionHistory.create({
        data: {
          account_id: account.account_id,
          payment_id,
          transaction_type: 'credit',
          amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description,
          reference_code,
          status: 'completed'
        }
      })

      return { account: updatedAccount, transaction }
    })

    return result.transaction
  }

  /**
   * Lấy lịch sử giao dịch của user
   * @param user_id - ID của user
   * @param page - Số trang
   * @param limit - Số lượng mỗi trang
   * @returns Danh sách giao dịch và pagination
   */
  getTransactionHistory = async (user_id: string, page?: number, limit?: number) => {
    const account = await this.getAccountByUserId(user_id)

    if (!page || !limit) {
      const transactions = await prisma.dBM_TransactionHistory.findMany({
        where: { account_id: account.account_id },
        orderBy: { created_at: 'desc' },
        include: {
          payment: {
            include: {
              contract: {
                include: {
                  resident: {
                    select: {
                      resident_id: true,
                      full_name: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      return { transactions }
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const safePage = Math.max(page, 1)
    const skip = (safePage - 1) * safeLimit

    const [total, transactions] = await prisma.$transaction([
      prisma.dBM_TransactionHistory.count({
        where: { account_id: account.account_id }
      }),
      prisma.dBM_TransactionHistory.findMany({
        where: { account_id: account.account_id },
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        include: {
          payment: {
            include: {
              contract: {
                include: {
                  resident: {
                    select: {
                      resident_id: true,
                      full_name: true
                    }
                  }
                }
              }
            }
          }
        }
      })
    ])

    return {
      transactions,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit))
      }
    }
  }

  /**
   * Tạo log thanh toán cho viện (để làm dashboard)
   * @param data - Thông tin thanh toán
   * @returns Payment log record
   */
  createPaymentLog = async (data: {
    institution_id: string
    payment_id: string
    amount: number
    payment_method: string
    status: string
    payer_id?: string
    payer_type?: string
    payer_name?: string
    resident_id?: string
    resident_name?: string
    contract_id?: string
    vnpay_order_id?: string
    vnpay_transaction_no?: string
    vnpay_response_code?: string
    vnpay_bank_code?: string
    account_id?: string
    transaction_id?: string
    period_start?: Date
    period_end?: Date
    notes?: string
  }) => {
    const log = await prisma.dBM_PaymentLog.create({
      data: {
        institution_id: data.institution_id,
        payment_id: data.payment_id,
        amount: data.amount,
        payment_method: data.payment_method,
        status: data.status,
        payer_id: data.payer_id,
        payer_type: data.payer_type,
        payer_name: data.payer_name,
        resident_id: data.resident_id,
        resident_name: data.resident_name,
        contract_id: data.contract_id,
        vnpay_order_id: data.vnpay_order_id,
        vnpay_transaction_no: data.vnpay_transaction_no,
        vnpay_response_code: data.vnpay_response_code,
        vnpay_bank_code: data.vnpay_bank_code,
        account_id: data.account_id,
        transaction_id: data.transaction_id,
        period_start: data.period_start,
        period_end: data.period_end,
        notes: data.notes
      },
      include: {
        institution: {
          select: {
            institution_id: true,
            name: true
          }
        },
        payment: true,
        payer: {
          select: {
            user_id: true,
            email: true,
            role: true
          }
        },
        account: true,
        transaction: true
      }
    })

    return log
  }

  /**
   * Lấy thống kê thanh toán cho viện (để làm dashboard)
   * @param institution_id - ID của viện
   * @param start_date - Ngày bắt đầu
   * @param end_date - Ngày kết thúc
   * @returns Thống kê thanh toán
   */
  getPaymentStatistics = async (institution_id: string, start_date?: Date, end_date?: Date) => {
    const where: any = {
      institution_id
    }

    if (start_date || end_date) {
      where.created_at = {}
      if (start_date) {
        where.created_at.gte = start_date
      }
      if (end_date) {
        where.created_at.lte = end_date
      }
    }

    const [
      totalPayments,
      successfulPayments,
      failedPayments,
      totalAmount,
      successfulAmount,
      paymentByMethod,
      paymentByStatus
    ] = await prisma.$transaction([
      // Tổng số giao dịch
      prisma.dBM_PaymentLog.count({ where }),
      // Số giao dịch thành công
      prisma.dBM_PaymentLog.count({
        where: { ...where, status: 'SUCCESS' }
      }),
      // Số giao dịch thất bại
      prisma.dBM_PaymentLog.count({
        where: { ...where, status: 'FAILED' }
      }),
      // Tổng số tiền
      prisma.dBM_PaymentLog.aggregate({
        where,
        _sum: { amount: true }
      }),
      // Tổng số tiền thành công
      prisma.dBM_PaymentLog.aggregate({
        where: { ...where, status: 'SUCCESS' },
        _sum: { amount: true }
      }),
      // Thống kê theo phương thức thanh toán
      prisma.dBM_PaymentLog.groupBy({
        by: ['payment_method'],
        where,
        orderBy: { payment_method: 'asc' },
        _count: { payment_method: true },
        _sum: { amount: true }
      }),
      // Thống kê theo trạng thái
      prisma.dBM_PaymentLog.groupBy({
        by: ['status'],
        where,
        orderBy: { status: 'asc' },
        _count: { status: true },
        _sum: { amount: true }
      })
    ])

    return {
      totalPayments,
      successfulPayments,
      failedPayments,
      totalAmount: totalAmount._sum.amount || 0,
      successfulAmount: successfulAmount._sum.amount || 0,
      paymentByMethod,
      paymentByStatus
    }
  }

  /**
   * Lấy revenue analytics theo thời gian (để làm chart)
   * @param institution_id - ID của viện
   * @param start_date - Ngày bắt đầu
   * @param end_date - Ngày kết thúc
   * @param granularity - Độ chi tiết: 'day', 'week', 'month'
   * @returns Series data cho chart
   */
  getRevenueAnalytics = async (
    institution_id: string,
    start_date?: Date,
    end_date?: Date,
    granularity: 'day' | 'week' | 'month' = 'month'
  ) => {
    const where: any = {
      institution_id,
      status: 'SUCCESS' // Chỉ lấy thanh toán thành công
    }

    if (start_date || end_date) {
      where.created_at = {}
      if (start_date) {
        where.created_at.gte = start_date
      }
      if (end_date) {
        where.created_at.lte = end_date
      }
    }

    // Lấy tất cả payment logs thành công
    const paymentLogs = await prisma.dBM_PaymentLog.findMany({
      where,
      select: {
        amount: true,
        created_at: true
      },
      orderBy: {
        created_at: 'asc'
      }
    })

    // Group theo granularity
    const buckets: Record<string, number> = {}

    paymentLogs.forEach((log) => {
      const date = new Date(log.created_at)
      let key: string

      if (granularity === 'day') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      } else if (granularity === 'week') {
        // Tính tuần trong năm
        const startOfYear = new Date(date.getFullYear(), 0, 1)
        const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
        const week = Math.ceil((days + startOfYear.getDay() + 1) / 7)
        key = `${date.getFullYear()}-W${String(week).padStart(2, '0')}`
      } else {
        // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }

      buckets[key] = (buckets[key] || 0) + log.amount
    })

    // Convert thành array và sort theo date
    const series = Object.entries(buckets)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, value]) => ({ date, value }))

    return { series }
  }

  /**
   * Lấy revenue analytics theo phương thức thanh toán
   * @param institution_id - ID của viện
   * @param start_date - Ngày bắt đầu
   * @param end_date - Ngày kết thúc
   * @returns Revenue theo từng phương thức thanh toán
   */
  getRevenueByPaymentMethod = async (institution_id: string, start_date?: Date, end_date?: Date) => {
    const where: any = {
      institution_id,
      status: 'SUCCESS'
    }

    if (start_date || end_date) {
      where.created_at = {}
      if (start_date) {
        where.created_at.gte = start_date
      }
      if (end_date) {
        where.created_at.lte = end_date
      }
    }

    const result = await prisma.dBM_PaymentLog.groupBy({
      by: ['payment_method'],
      where,
      _sum: {
        amount: true
      },
      _count: {
        payment_method: true
      },
      orderBy: {
        payment_method: 'asc'
      }
    })

    return result.map((item) => ({
      method: item.payment_method,
      totalAmount: item._sum.amount || 0,
      count: item._count.payment_method
    }))
  }
}

export const dbmAccountService = new DBMAccountService()
