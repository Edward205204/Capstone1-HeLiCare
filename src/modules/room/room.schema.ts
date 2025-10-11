import { RoomType } from '@prisma/client'

export const roomNumberSchema = {
  notEmpty: {
    errorMessage: 'Room number is required'
  },
  isString: {
    errorMessage: 'Room number must be a string'
  },
  isLength: {
    options: {
      min: 1,
      max: 50
    },
    errorMessage: 'Room number must be between 1 and 50 characters'
  }
}

export const roomTypeSchema = {
  notEmpty: {
    errorMessage: 'Room type is required'
  },
  isIn: {
    options: [Object.values(RoomType)],
    errorMessage: 'Room type must be one of: single, double, multi'
  }
}

export const roomCapacitySchema = {
  notEmpty: {
    errorMessage: 'Room capacity is required'
  },
  isInt: {
    options: {
      min: 1,
      max: 10
    },
    errorMessage: 'Room capacity must be between 1 and 10'
  }
}

export const roomNotesSchema = {
  optional: true,
  isString: {
    errorMessage: 'Room notes must be a string'
  },
  isLength: {
    options: {
      max: 500
    },
    errorMessage: 'Room notes must not exceed 500 characters'
  }
}

export const residentIdSchema = {
  notEmpty: {
    errorMessage: 'Resident ID is required'
  },
  isString: {
    errorMessage: 'Resident ID must be a string'
  },
  isUUID: {
    errorMessage: 'Resident ID must be a valid UUID'
  }
}

export const roomIdSchema = {
  notEmpty: {
    errorMessage: 'Room ID is required'
  },
  isString: {
    errorMessage: 'Room ID must be a string'
  },
  isUUID: {
    errorMessage: 'Room ID must be a valid UUID'
  }
}
