import { body, param, query } from 'express-validator'

// Validation schemas for assessment routes
export const createAssessmentSchema = [
  param('resident_id').isUUID().withMessage('Resident ID must be a valid UUID'),
  body('assessment').isObject().withMessage('Assessment must be an object'),
  body('assessment.cognitive_status')
    .optional()
    .isIn(['NORMAL', 'IMPAIRED', 'SEVERE'])
    .withMessage('Cognitive status must be NORMAL, IMPAIRED, or SEVERE'),
  body('assessment.mobility_status')
    .optional()
    .isIn(['INDEPENDENT', 'ASSISTED', 'DEPENDENT'])
    .withMessage('Mobility status must be INDEPENDENT, ASSISTED, or DEPENDENT'),
  body('assessment.weight_kg')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Weight must be a positive number less than 1000'),
  body('assessment.height_cm')
    .optional()
    .isFloat({ min: 0, max: 300 })
    .withMessage('Height must be a positive number less than 300'),
  body('assessment.bmi')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('BMI must be a positive number less than 100'),
  body('assessment.temperature_c')
    .optional()
    .isFloat({ min: 30, max: 45 })
    .withMessage('Temperature must be between 30 and 45 degrees Celsius'),
  body('assessment.blood_pressure_systolic')
    .optional()
    .isInt({ min: 50, max: 300 })
    .withMessage('Systolic blood pressure must be between 50 and 300'),
  body('assessment.blood_pressure_diastolic')
    .optional()
    .isInt({ min: 30, max: 200 })
    .withMessage('Diastolic blood pressure must be between 30 and 200'),
  body('assessment.heart_rate')
    .optional()
    .isInt({ min: 30, max: 300 })
    .withMessage('Heart rate must be between 30 and 300'),
  body('assessment.respiratory_rate')
    .optional()
    .isInt({ min: 5, max: 60 })
    .withMessage('Respiratory rate must be between 5 and 60'),
  body('assessment.oxygen_saturation')
    .optional()
    .isInt({ min: 50, max: 100 })
    .withMessage('Oxygen saturation must be between 50 and 100'),
  body('assessment.notes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Notes must be a string with maximum 1000 characters'),
  body('assessment.measured_at').optional().isISO8601().withMessage('Measured at must be a valid ISO 8601 date')
]

export const updateAssessmentSchema = [
  param('assessment_id').isUUID().withMessage('Assessment ID must be a valid UUID'),
  body('assessment').isObject().withMessage('Assessment must be an object'),
  body('assessment.cognitive_status')
    .optional()
    .isIn(['NORMAL', 'IMPAIRED', 'SEVERE'])
    .withMessage('Cognitive status must be NORMAL, IMPAIRED, or SEVERE'),
  body('assessment.mobility_status')
    .optional()
    .isIn(['INDEPENDENT', 'ASSISTED', 'DEPENDENT'])
    .withMessage('Mobility status must be INDEPENDENT, ASSISTED, or DEPENDENT'),
  body('assessment.weight_kg')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Weight must be a positive number less than 1000'),
  body('assessment.height_cm')
    .optional()
    .isFloat({ min: 0, max: 300 })
    .withMessage('Height must be a positive number less than 300'),
  body('assessment.bmi')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('BMI must be a positive number less than 100'),
  body('assessment.temperature_c')
    .optional()
    .isFloat({ min: 30, max: 45 })
    .withMessage('Temperature must be between 30 and 45 degrees Celsius'),
  body('assessment.blood_pressure_systolic')
    .optional()
    .isInt({ min: 50, max: 300 })
    .withMessage('Systolic blood pressure must be between 50 and 300'),
  body('assessment.blood_pressure_diastolic')
    .optional()
    .isInt({ min: 30, max: 200 })
    .withMessage('Diastolic blood pressure must be between 30 and 200'),
  body('assessment.heart_rate')
    .optional()
    .isInt({ min: 30, max: 300 })
    .withMessage('Heart rate must be between 30 and 300'),
  body('assessment.respiratory_rate')
    .optional()
    .isInt({ min: 5, max: 60 })
    .withMessage('Respiratory rate must be between 5 and 60'),
  body('assessment.oxygen_saturation')
    .optional()
    .isInt({ min: 50, max: 100 })
    .withMessage('Oxygen saturation must be between 50 and 100'),
  body('assessment.notes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Notes must be a string with maximum 1000 characters'),
  body('assessment.measured_at').optional().isISO8601().withMessage('Measured at must be a valid ISO 8601 date')
]

export const getAssessmentByIdSchema = [
  param('assessment_id').isUUID().withMessage('Assessment ID must be a valid UUID')
]

export const getAssessmentsByResidentSchema = [
  param('resident_id').isUUID().withMessage('Resident ID must be a valid UUID'),
  query('take').optional().isInt({ min: 1, max: 100 }).withMessage('Take must be an integer between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer')
]

export const getAssessmentsSchema = [
  query('take').optional().isInt({ min: 1, max: 100 }).withMessage('Take must be an integer between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer')
]

export const getAssessmentsHistorySchema = [
  query('take').optional().isInt({ min: 1, max: 100 }).withMessage('Take must be an integer between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer')
]

export const getAssessmentsQuerySchema = [
  query('take').optional().isInt({ min: 1, max: 100 }).withMessage('Take must be an integer between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),
  query('resident_id').optional().isUUID().withMessage('Resident ID must be a valid UUID'),
  query('assessed_by_id').optional().isUUID().withMessage('Assessed by ID must be a valid UUID'),
  query('cognitive_status')
    .optional()
    .isIn(['all', 'NORMAL', 'IMPAIRED', 'SEVERE'])
    .withMessage('Cognitive status must be all, NORMAL, IMPAIRED, or SEVERE'),
  query('mobility_status')
    .optional()
    .isIn(['all', 'INDEPENDENT', 'ASSISTED', 'DEPENDENT'])
    .withMessage('Mobility status must be all, INDEPENDENT, ASSISTED, or DEPENDENT'),
  query('time')
    .optional()
    .isIn(['all', 'lte_today', 'gte_today'])
    .withMessage('Time must be all, lte_today, or gte_today'),
  query('start_date').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('end_date').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date')
]

export const deleteAssessmentSchema = [
  param('assessment_id').isUUID().withMessage('Assessment ID must be a valid UUID')
]
