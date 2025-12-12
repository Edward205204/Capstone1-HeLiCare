import { PaymentMethod, PaymentStatus } from '@prisma/client'

export const contractIdSchema = {
  notEmpty: {
    errorMessage: 'Contract ID is required'
  },
  isString: {
    errorMessage: 'Contract ID must be a string'
  },
  isUUID: {
    errorMessage: 'Contract ID must be a valid UUID'
  }
}

export const paymentMethodSchema = {
  notEmpty: {
    errorMessage: 'Payment method is required'
  },
  isIn: {
    options: [Object.values(PaymentMethod)],
    errorMessage: `Payment method must be one of: ${Object.values(PaymentMethod).join(', ')}`
  }
}

export const amountSchema = {
  notEmpty: {
    errorMessage: 'Amount is required'
  },
  isFloat: {
    options: { min: 0 },
    errorMessage: 'Amount must be a positive number'
  },
  toFloat: true
}

export const periodStartSchema = {
  notEmpty: {
    errorMessage: 'Period start date is required'
  },
  isISO8601: {
    errorMessage: 'Period start date must be a valid ISO 8601 date'
  }
}

export const periodEndSchema = {
  notEmpty: {
    errorMessage: 'Period end date is required'
  },
  isISO8601: {
    errorMessage: 'Period end date must be a valid ISO 8601 date'
  }
}

export const notesSchema = {
  optional: true,
  isString: {
    errorMessage: 'Notes must be a string'
  },
  isLength: {
    options: { max: 1000 },
    errorMessage: 'Notes must not exceed 1000 characters'
  }
}

export const paymentIdSchema = {
  notEmpty: {
    errorMessage: 'Payment ID is required'
  },
  isString: {
    errorMessage: 'Payment ID must be a string'
  },
  isUUID: {
    errorMessage: 'Payment ID must be a valid UUID'
  }
}

export const statusSchema = {
  optional: true,
  isIn: {
    options: [Object.values(PaymentStatus)],
    errorMessage: `Status must be one of: ${Object.values(PaymentStatus).join(', ')}`
  }
}

export const transactionRefSchema = {
  optional: true,
  isString: {
    errorMessage: 'Transaction reference must be a string'
  },
  isLength: {
    options: { max: 255 },
    errorMessage: 'Transaction reference must not exceed 255 characters'
  }
}

export const proofImageUrlSchema = {
  notEmpty: {
    errorMessage: 'Proof image URL is required'
  },
  isString: {
    errorMessage: 'Proof image URL must be a string'
  },
  isURL: {
    errorMessage: 'Proof image URL must be a valid URL'
  }
}
