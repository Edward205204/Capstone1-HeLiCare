import { prisma } from '~/utils/db'
import {
  CreateContractParams,
  UpdateContractParams,
  GetContractsParams,
  AddServiceToContractParams,
  UpdateContractServiceParams,
  SignContractParams
} from './contract.dto'
import { ContractStatus } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'

class ContractService {
  constructor() {}

  // GET Methods
  getContracts = async (params: GetContractsParams) => {
    const { institution_id, status, resident_id, family_user_id, take = 20, skip = 0 } = params

    const where: any = { institution_id }

    if (status) {
      where.status = status
    }

    if (resident_id) {
      where.resident_id = resident_id
    }

    if (family_user_id) {
      where.family_user_id = family_user_id
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          institution: {
            select: {
              institution_id: true,
              name: true
            }
          },
          resident: {
            select: {
              resident_id: true,
              full_name: true,
              gender: true,
              date_of_birth: true
            }
          },
          family_user: {
            select: {
              user_id: true,
              email: true,
              familyProfile: {
                select: {
                  full_name: true,
                  phone: true
                }
              }
            }
          },
          room: {
            select: {
              room_id: true,
              room_number: true,
              type: true
            }
          },
          contractServices: {
            include: {
              package: {
                select: {
                  package_id: true,
                  name: true,
                  type: true
                }
              }
            }
          }
        },
        take,
        skip,
        orderBy: { created_at: 'desc' }
      }),
      prisma.contract.count({ where })
    ])

    return { contracts, total }
  }

  getContractById = async (contract_id: string) => {
    const contract = await prisma.contract.findUnique({
      where: { contract_id },
      include: {
        institution: {
          select: {
            institution_id: true,
            name: true,
            address: true,
            contact_info: true
          }
        },
        resident: {
          select: {
            resident_id: true,
            full_name: true,
            gender: true,
            date_of_birth: true,
            notes: true
          }
        },
        family_user: {
          select: {
            user_id: true,
            email: true,
            familyProfile: {
              select: {
                full_name: true,
                phone: true,
                address: true
              }
            }
          }
        },
        room: {
          select: {
            room_id: true,
            room_number: true,
            type: true,
            capacity: true
          }
        },
        contractServices: {
          include: {
            package: true
          }
        }
      }
    })

    if (!contract) {
      throw new ErrorWithStatus({
        message: 'Contract not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return contract
  }

  getContractsByResident = async (resident_id: string) => {
    const contracts = await prisma.contract.findMany({
      where: { resident_id },
      include: {
        contractServices: {
          include: {
            package: true
          }
        },
        room: true
      },
      orderBy: { created_at: 'desc' }
    })

    return contracts
  }

  getActiveContractByResident = async (resident_id: string) => {
    const contract = await prisma.contract.findFirst({
      where: {
        resident_id,
        status: ContractStatus.active
      },
      include: {
        contractServices: {
          include: {
            package: true
          }
        },
        room: true
      }
    })

    return contract
  }

  // POST Methods
  createContract = async (data: CreateContractParams) => {
    const {
      institution_id,
      resident_id,
      family_user_id,
      contract_number,
      payment_frequency,
      total_amount,
      start_date,
      end_date,
      room_id,
      notes,
      service_packages
    } = data

    // Check if contract number already exists
    const existingContract = await prisma.contract.findUnique({
      where: { contract_number }
    })

    if (existingContract) {
      throw new ErrorWithStatus({
        message: 'Contract number already exists',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // Check if resident exists
    const resident = await prisma.resident.findUnique({
      where: { resident_id }
    })

    if (!resident) {
      throw new ErrorWithStatus({
        message: 'Resident not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Create contract with services
    const newContract = await prisma.contract.create({
      data: {
        institution_id,
        resident_id,
        family_user_id,
        contract_number,
        payment_frequency,
        total_amount,
        start_date: new Date(start_date),
        end_date: end_date ? new Date(end_date) : null,
        room_id,
        notes,
        contractServices: {
          create: service_packages.map((pkg) => ({
            package_id: pkg.package_id,
            price_at_signing: pkg.price_at_signing,
            start_date: new Date(pkg.start_date),
            end_date: pkg.end_date ? new Date(pkg.end_date) : null
          }))
        }
      },
      include: {
        contractServices: {
          include: {
            package: true
          }
        }
      }
    })

    return newContract
  }

  // PUT Methods
  updateContract = async (params: UpdateContractParams) => {
    const { contract_id, updateData } = params

    // Check if contract exists
    const existingContract = await prisma.contract.findUnique({
      where: { contract_id }
    })

    if (!existingContract) {
      throw new ErrorWithStatus({
        message: 'Contract not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Convert dates if provided
    const dataToUpdate: any = { ...updateData }
    if (updateData.start_date) {
      dataToUpdate.start_date = new Date(updateData.start_date)
    }
    if (updateData.end_date) {
      dataToUpdate.end_date = new Date(updateData.end_date)
    }
    if (updateData.signed_date) {
      dataToUpdate.signed_date = new Date(updateData.signed_date)
    }

    const updatedContract = await prisma.contract.update({
      where: { contract_id },
      data: dataToUpdate,
      include: {
        contractServices: {
          include: {
            package: true
          }
        }
      }
    })

    return updatedContract
  }

  signContract = async (params: SignContractParams) => {
    const { contract_id, signed_date, room_id } = params

    const updatedContract = await prisma.contract.update({
      where: { contract_id },
      data: {
        signed_date: new Date(signed_date),
        room_id,
        status: ContractStatus.active
      },
      include: {
        contractServices: {
          include: {
            package: true
          }
        }
      }
    })

    // Update room availability if room_id is provided
    if (room_id) {
      await prisma.room.update({
        where: { room_id },
        data: {
          current_occupancy: {
            increment: 1
          },
          is_available: {
            set: false
          }
        }
      })
    }

    return updatedContract
  }

  cancelContract = async (contract_id: string) => {
    const contract = await prisma.contract.findUnique({
      where: { contract_id }
    })

    if (!contract) {
      throw new ErrorWithStatus({
        message: 'Contract not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const updatedContract = await prisma.contract.update({
      where: { contract_id },
      data: {
        status: ContractStatus.cancelled
      }
    })

    // Update room availability if room was assigned
    if (contract.room_id) {
      await prisma.room.update({
        where: { room_id: contract.room_id },
        data: {
          current_occupancy: {
            decrement: 1
          }
        }
      })

      // Check if room should be available again
      const room = await prisma.room.findUnique({
        where: { room_id: contract.room_id }
      })

      if (room && room.current_occupancy < room.capacity) {
        await prisma.room.update({
          where: { room_id: contract.room_id },
          data: {
            is_available: true
          }
        })
      }
    }

    return updatedContract
  }

  // Contract Services
  addServiceToContract = async (params: AddServiceToContractParams) => {
    const { contract_id, package_id, price_at_signing, start_date, end_date } = params

    // Check if contract exists
    const contract = await prisma.contract.findUnique({
      where: { contract_id }
    })

    if (!contract) {
      throw new ErrorWithStatus({
        message: 'Contract not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Check if package exists
    const servicePackage = await prisma.servicePackage.findUnique({
      where: { package_id }
    })

    if (!servicePackage) {
      throw new ErrorWithStatus({
        message: 'Service package not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const newContractService = await prisma.contractService.create({
      data: {
        contract_id,
        package_id,
        price_at_signing,
        start_date: new Date(start_date),
        end_date: end_date ? new Date(end_date) : null
      },
      include: {
        package: true
      }
    })

    return newContractService
  }

  updateContractService = async (params: UpdateContractServiceParams) => {
    const { contract_service_id, updateData } = params

    const dataToUpdate: any = { ...updateData }
    if (updateData.end_date) {
      dataToUpdate.end_date = new Date(updateData.end_date)
    }

    const updatedContractService = await prisma.contractService.update({
      where: { contract_service_id },
      data: dataToUpdate,
      include: {
        package: true
      }
    })

    return updatedContractService
  }

  // DELETE Methods
  deleteContract = async (contract_id: string) => {
    const contract = await prisma.contract.findUnique({
      where: { contract_id },
      include: {
        contractServices: true
      }
    })

    if (!contract) {
      throw new ErrorWithStatus({
        message: 'Contract not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Delete all contract services first
    await prisma.contractService.deleteMany({
      where: { contract_id }
    })

    // Delete contract
    await prisma.contract.delete({
      where: { contract_id }
    })
  }
}

const contractService = new ContractService()

export { contractService, ContractService }
