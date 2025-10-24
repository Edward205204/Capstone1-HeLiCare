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

export const visitDateSchema = {
  notEmpty: {
    errorMessage: 'Visit date is required'
  },
  isISO8601: {
    errorMessage: 'Visit date must be a valid ISO date string'
  },
  custom: {
    options: (value: string) => {
      const visitDate = new Date(value)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (visitDate < today) {
        throw new Error('Visit date cannot be in the past')
      }

      // Không cho phép đặt lịch quá 30 ngày trong tương lai
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 30)

      if (visitDate > maxDate) {
        throw new Error('Visit date cannot be more than 30 days in the future')
      }

      return true
    }
  }
}

export const visitTimeSchema = {
  notEmpty: {
    errorMessage: 'Visit time is required'
  },
  matches: {
    options: /^([0-1]?\d|2[0-3]):[0-5]\d$/,
    errorMessage: 'Visit time must be in HH:MM format (e.g., 09:00, 14:30)'
  },
  custom: {
    options: (value: string) => {
      const [hours] = value.split(':').map(Number)

      // Chỉ cho phép thăm viếng từ 8:00 đến 18:00
      if (hours < 8 || hours > 18) {
        throw new Error('Visit time must be between 08:00 and 18:00')
      }

      return true
    }
  }
}

export const durationSchema = {
  optional: true,
  isInt: {
    options: {
      min: 30,
      max: 180
    },
    errorMessage: 'Duration must be between 30 and 180 minutes'
  }
}

export const purposeSchema = {
  optional: true,
  isString: {
    errorMessage: 'Purpose must be a string'
  },
  isLength: {
    options: {
      max: 200
    },
    errorMessage: 'Purpose must not exceed 200 characters'
  }
}

export const visitNotesSchema = {
  optional: true,
  isString: {
    errorMessage: 'Notes must be a string'
  },
  isLength: {
    options: {
      max: 500
    },
    errorMessage: 'Notes must not exceed 500 characters'
  }
}

export const visitIdSchema = {
  notEmpty: {
    errorMessage: 'Visit ID is required'
  },
  isString: {
    errorMessage: 'Visit ID must be a string'
  },
  isUUID: {
    errorMessage: 'Visit ID must be a valid UUID'
  }
}

export const visitStatusSchema = {
  notEmpty: {
    errorMessage: 'Visit status is required'
  },
  isIn: {
    options: [['approved', 'rejected']],
    errorMessage: 'Visit status must be either approved or rejected'
  }
}

export const dateQuerySchema = {
  notEmpty: {
    errorMessage: 'Date is required'
  },
  isISO8601: {
    errorMessage: 'Date must be a valid ISO date string'
  }
}

export const institutionIdQuerySchema = {
  optional: true,
  isString: {
    errorMessage: 'Institution ID must be a string'
  },
  isUUID: {
    errorMessage: 'Institution ID must be a valid UUID'
  }
}
