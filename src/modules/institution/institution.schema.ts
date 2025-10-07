import { ParamSchema } from 'express-validator'
import AddressJson from '~/constants/address_json'

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
  custom: {
    options: (value) => {
      try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new Error('Address must be a JSON object')
        }
        const keys: (keyof AddressJson)[] = ['province', 'district', 'ward', 'street', 'house_number']
        for (const key of keys) {
          if (typeof value[key] !== 'string' || value[key].trim() === '') {
            throw new Error(`Invalid or missing field: ${key}`)
          }
        }
        return true
      } catch (err: any) {
        throw new Error(err.message || 'Invalid address JSON')
      }
    }
  }
}

export const institutionContactInfoCreateSchema: ParamSchema = {
  notEmpty: { errorMessage: 'Contact info is required' },
  custom: {
    options: (value) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Contact info must be a JSON object')
      }
      if (!value.email) throw new Error('Email is required')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
        throw new Error('Email must be a valid email address')
      }
      if (!value.phone) throw new Error('Phone is required')
      if (!/^0[0-9]{9}$/.test(value.phone)) {
        throw new Error('Phone must be a valid phone number')
      }
      if ('facebook' in value && typeof value.facebook !== 'string') {
        throw new Error('facebook must be a string if provided')
      }
      return true
    }
  }
}

export const institutionContactInfoPatchSchema: ParamSchema = {
  optional: true,

  custom: {
    options: (value) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Contact info must be a JSON object')
      }

      // validate email
      if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
        throw new Error('Email must be a valid email')
      }

      if (value.phone && !/^0[0-9]{9}$/.test(value.phone)) {
        throw new Error('Phone must be a valid phone number')
      }
      if ('facebook' in value && typeof value.facebook !== 'string') {
        throw new Error('facebook must be a string if provided')
      }
      return true
    }
  }
}

export const institutionIdSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Institution ID is required'
  },
  isUUID: {
    errorMessage: 'Institution ID must be a valid UUID'
  },
  trim: true
}
