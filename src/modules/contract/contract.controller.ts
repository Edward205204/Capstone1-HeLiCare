import { Request, Response } from 'express'
import { contractService } from './contract.service'
import { HTTP_STATUS } from '~/constants/http_status'
import { ContractStatus } from '@prisma/client'

class ContractController {
  constructor() {}

  // GET Methods
  getContracts = async (req: Request, res: Response) => {
    const { institution_id } = req.decoded_authorization as any
    const { status, resident_id, family_user_id, take, skip } = req.query

    const result = await contractService.getContracts({
      institution_id,
      status: status as ContractStatus,
      resident_id: resident_id as string,
      family_user_id: family_user_id as string,
      take: take ? parseInt(take as string) : undefined,
      skip: skip ? parseInt(skip as string) : undefined
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Get contracts successfully',
      data: result.contracts,
      total: result.total
    })
  }

  getContractById = async (req: Request, res: Response) => {
    const { contract_id } = req.params

    const contract = await contractService.getContractById(contract_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get contract successfully',
      data: contract
    })
  }

  getContractsByResident = async (req: Request, res: Response) => {
    const { resident_id } = req.params

    const contracts = await contractService.getContractsByResident(resident_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get contracts by resident successfully',
      data: contracts
    })
  }

  getActiveContractByResident = async (req: Request, res: Response) => {
    const { resident_id } = req.params

    const contract = await contractService.getActiveContractByResident(resident_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Get active contract by resident successfully',
      data: contract
    })
  }

  // POST Methods
  createContract = async (req: Request, res: Response) => {
    const { institution_id } = req.decoded_authorization as any
    const {
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
    } = req.body

    const newContract = await contractService.createContract({
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
    })

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Create contract successfully',
      data: newContract
    })
  }

  addServiceToContract = async (req: Request, res: Response) => {
    const { contract_id } = req.params
    const { package_id, price_at_signing, start_date, end_date } = req.body

    const newContractService = await contractService.addServiceToContract({
      contract_id,
      package_id,
      price_at_signing,
      start_date,
      end_date
    })

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Add service to contract successfully',
      data: newContractService
    })
  }

  // PUT Methods
  updateContract = async (req: Request, res: Response) => {
    const { contract_id } = req.params
    const updateData = req.body

    const updatedContract = await contractService.updateContract({
      contract_id,
      updateData
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Update contract successfully',
      data: updatedContract
    })
  }

  signContract = async (req: Request, res: Response) => {
    const { contract_id } = req.params
    const { signed_date, room_id } = req.body

    const updatedContract = await contractService.signContract({
      contract_id,
      signed_date,
      room_id
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Sign contract successfully',
      data: updatedContract
    })
  }

  cancelContract = async (req: Request, res: Response) => {
    const { contract_id } = req.params

    const updatedContract = await contractService.cancelContract(contract_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Cancel contract successfully',
      data: updatedContract
    })
  }

  updateContractService = async (req: Request, res: Response) => {
    const { contract_service_id } = req.params
    const updateData = req.body

    const updatedContractService = await contractService.updateContractService({
      contract_service_id,
      updateData
    })

    res.status(HTTP_STATUS.OK).json({
      message: 'Update contract service successfully',
      data: updatedContractService
    })
  }

  // DELETE Methods
  deleteContract = async (req: Request, res: Response) => {
    const { contract_id } = req.params

    await contractService.deleteContract(contract_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Delete contract successfully'
    })
  }
}

const contractController = new ContractController()

export { contractController, ContractController }
