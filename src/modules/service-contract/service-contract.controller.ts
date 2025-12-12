import { Request, Response } from 'express'
import { serviceContractService } from './service-contract.service'
import { HTTP_STATUS } from '~/constants/http_status'
import {
  CreateServiceContractReqBody,
  UpdateServiceContractReqBody,
  GetServiceContractsQuery
} from './service-contract.dto'
import { commonService } from '~/common/common.service'

class ServiceContractController {
  // Tạo hợp đồng dịch vụ (Admin/Staff)
  createServiceContract = async (req: Request, res: Response) => {
    try {
      const institution_id = req.decoded_authorization?.institution_id as string
      const data = req.body as CreateServiceContractReqBody

      if (!institution_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'Institution ID not found'
        })
        return
      }

      const contract = await serviceContractService.createServiceContract(institution_id, data)

      res.status(HTTP_STATUS.CREATED).json({
        message: 'Service contract created successfully',
        data: contract
      })
    } catch (error: any) {
      console.error('Error in createServiceContract:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to create service contract'
      })
    }
  }

  // Lấy danh sách hợp đồng (Admin/Staff)
  getServiceContracts = async (req: Request, res: Response) => {
    try {
      const institution_id = req.decoded_authorization?.institution_id as string
      const query = req.query as any

      if (!institution_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'Institution ID not found'
        })
        return
      }

      // Convert query params to proper types
      const params: GetServiceContractsQuery = {
        institution_id,
        resident_id: query.resident_id as string | undefined,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
        is_active:
          query.is_active !== undefined
            ? typeof query.is_active === 'string'
              ? query.is_active === 'true'
              : Boolean(query.is_active)
            : undefined
      }

      const result = await serviceContractService.getServiceContracts(params)

      res.status(HTTP_STATUS.OK).json({
        message: 'Service contracts retrieved successfully',
        ...result
      })
    } catch (error: any) {
      console.error('Error in getServiceContracts:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve service contracts'
      })
    }
  }

  // Lấy hợp đồng theo ID
  getServiceContractById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const contract = await serviceContractService.getServiceContractById(id)

      res.status(HTTP_STATUS.OK).json({
        message: 'Service contract retrieved successfully',
        data: contract
      })
    } catch (error: any) {
      console.error('Error in getServiceContractById:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve service contract'
      })
    }
  }

  // Lấy hợp đồng của resident
  getServiceContractByResidentId = async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const contract = await serviceContractService.getServiceContractByResidentId(id)

      if (!contract) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'No active service contract found for this resident'
        })
        return
      }

      res.status(HTTP_STATUS.OK).json({
        message: 'Service contract retrieved successfully',
        data: contract
      })
    } catch (error: any) {
      console.error('Error in getServiceContractByResidentId:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve service contract'
      })
    }
  }

  // Lấy hợp đồng của Family user
  getServiceContractsByFamily = async (req: Request, res: Response) => {
    try {
      const family_user_id = req.decoded_authorization?.user_id as string

      if (!family_user_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'User ID not found'
        })
        return
      }

      const contracts = await serviceContractService.getServiceContractsByFamily(family_user_id)

      res.status(HTTP_STATUS.OK).json({
        message: 'Service contracts retrieved successfully',
        data: contracts
      })
    } catch (error: any) {
      console.error('Error in getServiceContractsByFamily:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to retrieve service contracts'
      })
    }
  }

  // Cập nhật hợp đồng (Admin/Staff)
  updateServiceContract = async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const institution_id = req.decoded_authorization?.institution_id as string
      const data = req.body as UpdateServiceContractReqBody

      if (!institution_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'Institution ID not found'
        })
        return
      }

      const contract = await serviceContractService.updateServiceContract(id, institution_id, data)

      res.status(HTTP_STATUS.OK).json({
        message: 'Service contract updated successfully',
        data: contract
      })
    } catch (error: any) {
      console.error('Error in updateServiceContract:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to update service contract'
      })
    }
  }

  // Xóa/hủy hợp đồng (Admin/Staff)
  deleteServiceContract = async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const institution_id = req.decoded_authorization?.institution_id as string

      if (!institution_id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: 'Institution ID not found'
        })
        return
      }

      await serviceContractService.deleteServiceContract(id, institution_id)

      res.status(HTTP_STATUS.OK).json({
        message: 'Service contract deleted successfully'
      })
    } catch (error: any) {
      console.error('Error in deleteServiceContract:', error)
      res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to delete service contract'
      })
    }
  }
}

export const serviceContractController = new ServiceContractController()
