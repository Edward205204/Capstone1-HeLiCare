import { ParamSchema } from 'express-validator'
import AddressJson from '~/constants/address_json'
import { ContactJson } from '~/constants/contact_json'

export const institutionNameSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Name is required'
  },
  isString: {
    errorMessage: 'Name must be a string'
  },
  trim: true
}

export const institutionAddressSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Address is required'
  },
  isJSON: {
    errorMessage: 'Address must be a JSON object'
  },
  custom: {
    options: (value) => {
      try {
        const obj = JSON.parse(value)

        const keys: (keyof AddressJson)[] = ['province', 'district', 'ward', 'street', 'house_number']
        for (const key of keys) {
          if (typeof obj[key] !== 'string' || obj[key].trim() === '') {
            throw new Error(`Invalid or missing field: ${key}`)
          }
        }
        return true
      } catch (err: any) {
        throw new Error(err.message || 'Invalid address JSON')
      }
    }
  },

  trim: true
}

export const institutionContactInfoSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Contact info is required'
  },
  isJSON: {
    errorMessage: 'Contact info must be a string'
  },
  custom: {
    options: (value) => {
      try {
        const obj = JSON.parse(value)

        const requiredFields: (keyof ContactJson)[] = ['email', 'phone']
        for (const key of requiredFields) {
          if (typeof obj[key] !== 'string' || obj[key].trim() === '') {
            throw new Error(`Missing or invalid field: ${key}`)
          }
        }

        if ('facebook' in obj && typeof obj.facebook !== 'string') {
          throw new Error('facebook must be a string if provided')
        }

        return true
      } catch (err: any) {
        throw new Error(err.message || 'Invalid contact info JSON')
      }
    }
  },
  trim: true
}
