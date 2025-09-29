import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'
import { institutionAddressSchema, institutionContactInfoSchema, institutionNameSchema } from './institution.schema'

export const createInstitutionValidator = validate(
  checkSchema(
    {
      name: institutionNameSchema,
      address: institutionAddressSchema,
      contact_info: institutionContactInfoSchema
    },
    ['body']
  )
)
