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

export const paymentMethodSchema = {
  notEmpty: {
    errorMessage: 'Payment method is required'
  },
  isIn: {
    options: [['COD', 'momo', 'bank_transfer', 'visa', 'paypal']],
    errorMessage: 'Payment method must be one of: COD, momo, bank_transfer, visa, paypal'
  }
}

export const paymentStatusSchema = {
  notEmpty: {
    errorMessage: 'Payment status is required'
  },
  isIn: {
    options: [['paid', 'overdue', 'pending', 'failed', 'cancelled', 'refunded']],
    errorMessage: 'Payment status must be one of: paid, overdue, pending, failed, cancelled, refunded'
  }
}

export const amountSchema = {
  notEmpty: {
    errorMessage: 'Amount is required'
  },
  isFloat: {
    options: {
      min: 0.01
    },
    errorMessage: 'Amount must be a positive number'
  }
}

export const dateSchema = {
  notEmpty: {
    errorMessage: 'Date is required'
  },
  isISO8601: {
    errorMessage: 'Date must be a valid ISO 8601 date string'
  }
}

export const paymentPeriodStartSchema = {
  notEmpty: {
    errorMessage: 'Payment period start date is required'
  },
  isISO8601: {
    errorMessage: 'Payment period start must be a valid ISO date string'
  }
}

export const paymentPeriodEndSchema = {
  notEmpty: {
    errorMessage: 'Payment period end date is required'
  },
  isISO8601: {
    errorMessage: 'Payment period end must be a valid ISO date string'
  },
  custom: {
    options: (value: string, { req }: any) => {
      const startDate = new Date(req.body.payment_period_start)
      const endDate = new Date(value)

      if (endDate <= startDate) {
        throw new Error('Payment period end date must be after start date')
      }

      return true
    }
  }
}

export const notesSchema = {
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

export const returnUrlSchema = {
  optional: true,
  isURL: {
    errorMessage: 'Return URL must be a valid URL'
  }
}

export const notifyUrlSchema = {
  optional: true,
  isURL: {
    errorMessage: 'Notify URL must be a valid URL'
  }
}

