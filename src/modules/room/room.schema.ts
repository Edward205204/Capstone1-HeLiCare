import { checkSchema } from 'express-validator'

export const roomIdSchema = {
  room_id: {
    in: ['params'],
    isUUID: {
      errorMessage: 'Invalid room_id'
    }
  }
}

export const createRoomSchema = checkSchema(
  {
    room_number: {
      in: ['body'],
      isString: {
        errorMessage: 'room_number must be string'
      },
      trim: true,
      notEmpty: {
        errorMessage: 'room_number is required'
      }
    },
    type: {
      in: ['body'],
      isIn: {
        options: [['single', 'double', 'multi']],
        errorMessage: 'type must be one of single, double, multi'
      }
    },
    capacity: {
      in: ['body'],
      isInt: {
        options: { min: 1 },
        errorMessage: 'capacity must be >= 1'
      },
      toInt: true
    },
    is_available: {
      in: ['body'],
      optional: true,
      isBoolean: {
        errorMessage: 'is_available must be boolean'
      },
      toBoolean: true
    },
    notes: {
      in: ['body'],
      optional: true,
      isString: {
        errorMessage: 'notes must be string'
      }
    }
  },
  ['body']
)

export const updateRoomSchema = checkSchema(
  {
    room_number: {
      in: ['body'],
      optional: true,
      isString: {
        errorMessage: 'room_number must be string'
      },
      trim: true
    },
    type: {
      in: ['body'],
      optional: true,
      isIn: {
        options: [['single', 'double', 'multi']],
        errorMessage: 'type must be one of single, double, multi'
      }
    },
    capacity: {
      in: ['body'],
      optional: true,
      isInt: {
        options: { min: 1 },
        errorMessage: 'capacity must be >= 1'
      },
      toInt: true
    },
    is_available: {
      in: ['body'],
      optional: true,
      isBoolean: {
        errorMessage: 'is_available must be boolean'
      },
      toBoolean: true
    },
    notes: {
      in: ['body'],
      optional: true,
      isString: {
        errorMessage: 'notes must be string'
      }
    }
  },
  ['body']
)


