import { FeedbackCategory, FeedbackPriority } from '@prisma/client'

export const feedbackCategorySchema = {
  notEmpty: {
    errorMessage: 'Category is required'
  },
  isIn: {
    options: [Object.values(FeedbackCategory)],
    errorMessage: `Category must be one of: ${Object.values(FeedbackCategory).join(', ')}`
  }
}

export const feedbackPrioritySchema = {
  notEmpty: {
    errorMessage: 'Priority is required'
  },
  isIn: {
    options: [Object.values(FeedbackPriority)],
    errorMessage: `Priority must be one of: ${Object.values(FeedbackPriority).join(', ')}`
  }
}

export const feedbackSubjectSchema = {
  notEmpty: {
    errorMessage: 'Subject is required'
  },
  isString: {
    errorMessage: 'Subject must be a string'
  },
  isLength: {
    options: { min: 1, max: 200 },
    errorMessage: 'Subject must be between 1 and 200 characters'
  }
}

export const feedbackMessageSchema = {
  notEmpty: {
    errorMessage: 'Message is required'
  },
  isString: {
    errorMessage: 'Message must be a string'
  },
  isLength: {
    options: { min: 1, max: 5000 },
    errorMessage: 'Message must be between 1 and 5000 characters'
  }
}

export const feedbackAttachmentUrlSchema = {
  optional: true,
  isString: {
    errorMessage: 'Attachment URL must be a string'
  },
  isURL: {
    errorMessage: 'Attachment URL must be a valid URL'
  }
}
