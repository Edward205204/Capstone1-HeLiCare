export const residentIdSchema = {
  notEmpty: {
    errorMessage: 'Resident ID is required'
  },
  isString: {
    errorMessage: 'Resident ID must be a string'
  }
}

export const billingCycleSchema = {
  notEmpty: {
    errorMessage: 'Billing cycle is required'
  },
  isIn: {
    options: [['MONTHLY', 'YEARLY']],
    errorMessage: 'Billing cycle must be one of: MONTHLY, YEARLY'
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

export const nextBillingDateSchema = {
  notEmpty: {
    errorMessage: 'Next billing date is required'
  },
  isISO8601: {
    errorMessage: 'Next billing date must be a valid ISO 8601 date'
  }
}

export const startDateSchema = {
  optional: true,
  isISO8601: {
    errorMessage: 'Start date must be a valid ISO 8601 date'
  }
}

export const isActiveSchema = {
  optional: true,
  isBoolean: {
    errorMessage: 'is_active must be a boolean'
  },
  toBoolean: true
}

export const contractIdSchema = {
  notEmpty: {
    errorMessage: 'Contract ID is required'
  },
  isString: {
    errorMessage: 'Contract ID must be a string'
  }
}
