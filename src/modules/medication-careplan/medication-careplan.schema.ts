import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validate'

export const createMedicationSchema = validate(
  checkSchema(
    {
      name: {
        notEmpty: {
          errorMessage: 'Medication name is required'
        },
        isString: {
          errorMessage: 'Medication name must be a string'
        },
        trim: true,
        isLength: {
          options: { min: 1, max: 200 },
          errorMessage: 'Medication name must be between 1 and 200 characters'
        }
      },
      dosage: {
        notEmpty: {
          errorMessage: 'Dosage is required'
        },
        isString: {
          errorMessage: 'Dosage must be a string'
        },
        trim: true,
        isLength: {
          options: { min: 1, max: 100 },
          errorMessage: 'Dosage must be between 1 and 100 characters'
        }
      },
      form: {
        notEmpty: {
          errorMessage: 'Form is required'
        },
        isIn: {
          options: [['tablet', 'syrup', 'injection', 'capsule', 'liquid', 'cream', 'other']],
          errorMessage: 'Form must be one of: tablet, syrup, injection, capsule, liquid, cream, other'
        }
      },
      frequency: {
        notEmpty: {
          errorMessage: 'Frequency is required'
        },
        isString: {
          errorMessage: 'Frequency must be a string'
        },
        trim: true,
        isLength: {
          options: { min: 1, max: 100 },
          errorMessage: 'Frequency must be between 1 and 100 characters'
        }
      },
      instructions: {
        optional: true,
        isString: {
          errorMessage: 'Instructions must be a string'
        },
        trim: true,
        isLength: {
          options: { max: 1000 },
          errorMessage: 'Instructions must not exceed 1000 characters'
        }
      }
    },
    ['body']
  )
)

export const updateMedicationSchema = validate(
  checkSchema(
    {
      name: {
        optional: true,
        isString: {
          errorMessage: 'Medication name must be a string'
        },
        trim: true,
        isLength: {
          options: { min: 1, max: 200 },
          errorMessage: 'Medication name must be between 1 and 200 characters'
        }
      },
      dosage: {
        optional: true,
        isString: {
          errorMessage: 'Dosage must be a string'
        },
        trim: true,
        isLength: {
          options: { min: 1, max: 100 },
          errorMessage: 'Dosage must be between 1 and 100 characters'
        }
      },
      form: {
        optional: true,
        isIn: {
          options: [['tablet', 'syrup', 'injection', 'capsule', 'liquid', 'cream', 'other']],
          errorMessage: 'Form must be one of: tablet, syrup, injection, capsule, liquid, cream, other'
        }
      },
      frequency: {
        optional: true,
        isString: {
          errorMessage: 'Frequency must be a string'
        },
        trim: true,
        isLength: {
          options: { min: 1, max: 100 },
          errorMessage: 'Frequency must be between 1 and 100 characters'
        }
      },
      timing: {
        optional: true,
        isIn: {
          options: [['before_meal', 'after_meal', 'with_meal', 'any_time']],
          errorMessage: 'Timing must be one of: before_meal, after_meal, with_meal, any_time'
        }
      },
      instructions: {
        optional: true,
        isString: {
          errorMessage: 'Instructions must be a string'
        },
        trim: true,
        isLength: {
          options: { max: 1000 },
          errorMessage: 'Instructions must not exceed 1000 characters'
        }
      },
      is_active: {
        optional: true,
        isBoolean: {
          errorMessage: 'is_active must be a boolean'
        }
      }
    },
    ['body']
  )
)

export const createMedicationCarePlanSchema = validate(
  checkSchema(
    {
      medication_id: {
        notEmpty: {
          errorMessage: 'Medication ID is required'
        },
        isUUID: {
          errorMessage: 'Medication ID must be a valid UUID'
        }
      },
      resident_ids: {
        optional: true,
        isArray: {
          errorMessage: 'resident_ids must be an array'
        }
      },
      'resident_ids.*': {
        optional: true,
        isUUID: {
          errorMessage: 'Each resident_id must be a valid UUID'
        }
      },
      room_ids: {
        optional: true,
        isArray: {
          errorMessage: 'room_ids must be an array'
        }
      },
      'room_ids.*': {
        optional: true,
        isUUID: {
          errorMessage: 'Each room_id must be a valid UUID'
        }
      },
      staff_ids: {
        optional: true,
        isArray: {
          errorMessage: 'staff_ids must be an array'
        }
      },
      'staff_ids.*': {
        optional: true,
        isUUID: {
          errorMessage: 'Each staff_id must be a valid UUID'
        }
      },
      start_date: {
        notEmpty: {
          errorMessage: 'Start date is required'
        },
        isISO8601: {
          errorMessage: 'Start date must be a valid ISO 8601 date'
        }
      },
      end_date: {
        optional: true,
        isISO8601: {
          errorMessage: 'End date must be a valid ISO 8601 date'
        }
      },
      time_slot: {
        optional: true,
        isIn: {
          options: [['morning', 'noon', 'afternoon', 'evening']],
          errorMessage: 'Time slot must be one of: morning, noon, afternoon, evening'
        }
      },
      notes: {
        optional: true,
        isString: {
          errorMessage: 'Notes must be a string'
        },
        trim: true,
        isLength: {
          options: { max: 1000 },
          errorMessage: 'Notes must not exceed 1000 characters'
        }
      }
    },
    ['body']
  )
)

export const updateMedicationCarePlanSchema = validate(
  checkSchema(
    {
      resident_ids: {
        optional: true,
        isArray: {
          errorMessage: 'resident_ids must be an array'
        }
      },
      'resident_ids.*': {
        optional: true,
        isUUID: {
          errorMessage: 'Each resident_id must be a valid UUID'
        }
      },
      room_ids: {
        optional: true,
        isArray: {
          errorMessage: 'room_ids must be an array'
        }
      },
      'room_ids.*': {
        optional: true,
        isUUID: {
          errorMessage: 'Each room_id must be a valid UUID'
        }
      },
      staff_ids: {
        optional: true,
        isArray: {
          errorMessage: 'staff_ids must be an array'
        }
      },
      'staff_ids.*': {
        optional: true,
        isUUID: {
          errorMessage: 'Each staff_id must be a valid UUID'
        }
      },
      start_date: {
        optional: true,
        isISO8601: {
          errorMessage: 'Start date must be a valid ISO 8601 date'
        }
      },
      end_date: {
        optional: true,
        isISO8601: {
          errorMessage: 'End date must be a valid ISO 8601 date'
        }
      },
      time_slot: {
        optional: true,
        isIn: {
          options: [['morning', 'noon', 'afternoon', 'evening']],
          errorMessage: 'Time slot must be one of: morning, noon, afternoon, evening'
        }
      },
      is_active: {
        optional: true,
        isBoolean: {
          errorMessage: 'is_active must be a boolean'
        }
      },
      notes: {
        optional: true,
        isString: {
          errorMessage: 'Notes must be a string'
        },
        trim: true,
        isLength: {
          options: { max: 1000 },
          errorMessage: 'Notes must not exceed 1000 characters'
        }
      }
    },
    ['body']
  )
)

export const getMedicationsSchema = validate(
  checkSchema(
    {
      take: {
        optional: true,
        isInt: {
          options: { min: 1, max: 100 },
          errorMessage: 'take must be between 1 and 100'
        }
      },
      skip: {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: 'skip must be a non-negative integer'
        }
      },
      search: {
        optional: true,
        isString: {
          errorMessage: 'search must be a string'
        },
        trim: true
      },
      is_active: {
        optional: true,
        isBoolean: {
          errorMessage: 'is_active must be a boolean'
        }
      }
    },
    ['query']
  )
)

export const getCarePlansSchema = validate(
  checkSchema(
    {
      take: {
        optional: true,
        isInt: {
          options: { min: 1, max: 100 },
          errorMessage: 'take must be between 1 and 100'
        }
      },
      skip: {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: 'skip must be a non-negative integer'
        }
      },
      medication_id: {
        optional: true,
        isUUID: {
          errorMessage: 'medication_id must be a valid UUID'
        }
      },
      resident_id: {
        optional: true,
        isUUID: {
          errorMessage: 'resident_id must be a valid UUID'
        }
      },
      room_id: {
        optional: true,
        isUUID: {
          errorMessage: 'room_id must be a valid UUID'
        }
      },
      staff_id: {
        optional: true,
        isUUID: {
          errorMessage: 'staff_id must be a valid UUID'
        }
      },
      is_active: {
        optional: true,
        isBoolean: {
          errorMessage: 'is_active must be a boolean'
        }
      }
    },
    ['query']
  )
)

export const getAlertsSchema = validate(
  checkSchema(
    {
      medication_id: {
        notEmpty: {
          errorMessage: 'Medication ID is required'
        },
        isUUID: {
          errorMessage: 'Medication ID must be a valid UUID'
        }
      },
      resident_ids: {
        optional: true,
        isArray: {
          errorMessage: 'resident_ids must be an array'
        }
      },
      'resident_ids.*': {
        optional: true,
        isUUID: {
          errorMessage: 'Each resident_id must be a valid UUID'
        }
      }
    },
    ['query']
  )
)

export const getAssignedMedicationsSchema = validate(
  checkSchema(
    {
      take: {
        optional: true,
        isInt: {
          options: { min: 1, max: 100 },
          errorMessage: 'take must be between 1 and 100'
        }
      },
      skip: {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: 'skip must be a non-negative integer'
        }
      },
      medication_id: {
        optional: true,
        isString: {
          errorMessage: 'medication_id must be a string'
        }
      },
      resident_id: {
        optional: true,
        isString: {
          errorMessage: 'resident_id must be a string'
        }
      },
      room_id: {
        optional: true,
        isString: {
          errorMessage: 'room_id must be a string'
        }
      },
      time_slot: {
        optional: true,
        isIn: {
          options: [['morning', 'noon', 'afternoon', 'evening']],
          errorMessage: 'time_slot must be one of: morning, noon, afternoon, evening'
        }
      },
      is_active: {
        optional: true,
        isBoolean: {
          errorMessage: 'is_active must be a boolean'
        }
      }
    },
    ['query']
  )
)
