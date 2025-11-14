import { StaffPosition } from '@prisma/client'
import { ParamSchema } from 'express-validator'

export const positionSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Position is required'
  },
  isIn: {
    options: [
      [
        StaffPosition.NURSE,
        StaffPosition.CAREGIVER,
        StaffPosition.THERAPIST,
        StaffPosition.PHYSICIAN,
        StaffPosition.SOCIAL_WORKER,
        StaffPosition.ACTIVITY_COORDINATOR,
        StaffPosition.DIETITIAN,
        StaffPosition.OTHER
      ]
    ]
  }
}

export const hireDateSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Hire date is required'
  },

  trim: true
}

export const notesSchema: ParamSchema = {
  optional: {
    options: {
      nullable: true
    }
  },
  isString: {
    errorMessage: 'Notes must be a string'
  },
  trim: true
}

export const phoneSchema: ParamSchema = {
  notEmpty: {
    errorMessage: 'Phone is required'
  },
  isString: {
    errorMessage: 'Phone must be a string'
  },
  matches: {
    options: /^0[0-9]{9}$/,
    errorMessage: 'Phone must be a valid phone number'
  },
  trim: true
}

export const avatarSchema: ParamSchema = {
  optional: {
    options: {
      nullable: true
    }
  },
  isString: {
    errorMessage: 'Avatar must be a string'
  },
  trim: true
}
