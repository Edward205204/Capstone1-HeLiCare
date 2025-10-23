import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import {
  institutionAddressSchema,
  institutionContactInfoCreateSchema,
  institutionContactInfoPatchSchema,
  institutionIdSchema,
  institutionNameSchema
} from './institution.schema'
import { InstitutionContractStatus } from '@prisma/client'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import makePatchSchema from '~/utils/make_path_schema'
import { commonService } from '~/common/common.service'

export const createInstitutionValidator = validate(
  checkSchema(
    {
      name: institutionNameSchema,
      address: institutionAddressSchema,
      contact_info: institutionContactInfoCreateSchema
    },
    ['body']
  )
)

export const institutionIdValidator = validate(
  checkSchema(
    {
      institution_id: {
        ...institutionIdSchema,
        custom: {
          options: async (value) => {
            const institution = await commonService.getInstitutionById(value)
            if (!institution) {
              throw new ErrorWithStatus({
                message: 'Institution not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            if (institution.status !== InstitutionContractStatus.active) {
              throw new ErrorWithStatus({
                message: 'Institution is not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            return true
          }
        }
      }
    },
    ['params']
  )
)

// có thể update all
export const updateInstitutionValidator = validate(
  checkSchema(
    makePatchSchema({
      name: institutionNameSchema,
      address: institutionAddressSchema,
      contact_info: institutionContactInfoPatchSchema
    }),
    ['body']
  )
)
