import { body, param, query } from 'express-validator'

export const createDishSchema = [
  body('name').isString().notEmpty().withMessage('Dish name is required'),
  body('calories_per_100g').isFloat({ min: 0 }).withMessage('Calories must be a positive number'),
  body('texture').isIn(['Regular', 'Minced', 'Pureed']).withMessage('Texture must be Regular, Minced, or Pureed'),
  body('sugar_adjustable').isBoolean().withMessage('sugar_adjustable must be a boolean'),
  body('sodium_level').optional().isFloat({ min: 0 }).withMessage('Sodium level must be a positive number'),
  body('dietary_flags').optional().isArray().withMessage('dietary_flags must be an array'),
  body('dietary_flags.*').optional().isString().withMessage('Each dietary flag must be a string'),
  body('is_blendable').isBoolean().withMessage('is_blendable must be a boolean'),
  body('ingredients').isArray().withMessage('ingredients must be an array'),
  body('ingredients.*.ingredient_id')
    .isString()
    .notEmpty()
    .withMessage('Each ingredient_id must be a non-empty string'),
  body('ingredients.*.amount').isFloat({ min: 0 }).withMessage('Each ingredient amount must be a positive number')
]

export const updateDishSchema = [
  param('dish_id').isString().withMessage('Dish ID must be a string'),
  body('name').optional().isString().notEmpty().withMessage('Dish name must be a non-empty string'),
  body('calories_per_100g').optional().isFloat({ min: 0 }).withMessage('Calories must be a positive number'),
  body('texture')
    .optional()
    .isIn(['Regular', 'Minced', 'Pureed'])
    .withMessage('Texture must be Regular, Minced, or Pureed'),
  body('sugar_adjustable').optional().isBoolean().withMessage('sugar_adjustable must be a boolean'),
  body('sodium_level').optional().isFloat({ min: 0 }).withMessage('Sodium level must be a positive number'),
  body('dietary_flags').optional().isArray().withMessage('dietary_flags must be an array'),
  body('dietary_flags.*').optional().isString().withMessage('Each dietary flag must be a string'),
  body('is_blendable').optional().isBoolean().withMessage('is_blendable must be a boolean'),
  body('ingredients').optional().isArray().withMessage('ingredients must be an array'),
  body('ingredients.*.ingredient_id').optional().isString().withMessage('Each ingredient_id must be a string'),
  body('ingredients.*.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Each ingredient amount must be a positive number')
]

export const getDishByIdSchema = [param('dish_id').isString().withMessage('Dish ID must be a string')]

export const deleteDishSchema = [param('dish_id').isString().withMessage('Dish ID must be a string')]

export const createIngredientSchema = [
  body('name').isString().notEmpty().withMessage('Ingredient name is required'),
  body('unit').isIn(['g', 'ml', 'pcs']).withMessage('Unit must be g, ml, or pcs'),
  body('calories_per_100g').isFloat({ min: 0 }).withMessage('Calories must be a positive number'),
  body('protein_per_100g').optional().isFloat({ min: 0 }).withMessage('Protein must be a positive number'),
  body('fat_per_100g').optional().isFloat({ min: 0 }).withMessage('Fat must be a positive number'),
  body('carbs_per_100g').optional().isFloat({ min: 0 }).withMessage('Carbs must be a positive number'),
  body('fiber_per_100g').optional().isFloat({ min: 0 }).withMessage('Fiber must be a positive number'),
  body('sodium_per_100g').optional().isFloat({ min: 0 }).withMessage('Sodium must be a positive number')
]

export const updateIngredientSchema = [
  param('ingredient_id').isString().withMessage('Ingredient ID must be a string'),
  body('name').optional().isString().notEmpty().withMessage('Ingredient name must be a non-empty string'),
  body('unit').optional().isIn(['g', 'ml', 'pcs']).withMessage('Unit must be g, ml, or pcs'),
  body('calories_per_100g').optional().isFloat({ min: 0 }).withMessage('Calories must be a positive number'),
  body('protein_per_100g').optional().isFloat({ min: 0 }).withMessage('Protein must be a positive number'),
  body('fat_per_100g').optional().isFloat({ min: 0 }).withMessage('Fat must be a positive number'),
  body('carbs_per_100g').optional().isFloat({ min: 0 }).withMessage('Carbs must be a positive number'),
  body('fiber_per_100g').optional().isFloat({ min: 0 }).withMessage('Fiber must be a positive number'),
  body('sodium_per_100g').optional().isFloat({ min: 0 }).withMessage('Sodium must be a positive number')
]

export const getIngredientByIdSchema = [param('ingredient_id').isString().withMessage('Ingredient ID must be a string')]

export const deleteIngredientSchema = [param('ingredient_id').isString().withMessage('Ingredient ID must be a string')]

export const createWeeklyMenuSchema = [
  body('week_start_date').isISO8601().withMessage('week_start_date must be a valid ISO 8601 date'),
  body('menuItems').isArray().withMessage('menuItems must be an array'),
  body('menuItems.*.dish_id').isString().notEmpty().withMessage('Each dish_id must be a non-empty string'),
  body('menuItems.*.meal_slot')
    .isIn(['Breakfast', 'Lunch', 'Afternoon', 'Dinner'])
    .withMessage('meal_slot must be Breakfast, Lunch, Afternoon, or Dinner'),
  body('menuItems.*.day_of_week')
    .isInt({ min: 0, max: 6 })
    .withMessage('day_of_week must be between 0 (Monday) and 6 (Sunday)'),
  body('menuItems.*.servings')
    .optional()
    .isInt({ min: 0 })
    .withMessage('servings must be a non-negative integer (0 for auto-calculation)'),
  body('menuItems.*.texture_variant')
    .optional()
    .isIn(['Regular', 'Minced', 'Pureed'])
    .withMessage('texture_variant must be Regular, Minced, or Pureed')
]

export const copyWeekMenuSchema = [
  body('source_week_start_date').isISO8601().withMessage('source_week_start_date must be a valid ISO 8601 date'),
  body('target_week_start_date').isISO8601().withMessage('target_week_start_date must be a valid ISO 8601 date'),
  body('adjust_servings').optional().isBoolean().withMessage('adjust_servings must be a boolean')
]

export const getWeeklyMenuSchema = [param('menu_id').isString().withMessage('Menu ID must be a string')]

export const getWeeklyMenuByWeekSchema = [
  param('week_start_date').isISO8601().withMessage('week_start_date must be a valid ISO 8601 date')
]

export const getWeeklyMenusSchema = [
  query('take').optional().isInt({ min: 1, max: 100 }).withMessage('Take must be an integer between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer')
]

export const deleteWeeklyMenuSchema = [
  param('menu_id').isString().notEmpty().withMessage('Menu ID must be a non-empty string')
]

export const getDishSuggestionsSchema = [
  param('resident_id').isString().withMessage('Resident ID must be a string'),
  query('meal_slot')
    .optional()
    .isIn(['Breakfast', 'Lunch', 'Afternoon', 'Dinner'])
    .withMessage('meal_slot must be Breakfast, Lunch, Afternoon, or Dinner'),
  query('day_of_week').optional().isInt({ min: 0, max: 6 }).withMessage('day_of_week must be between 0 and 6')
]

export const generateDishVariantSchema = [
  param('dish_id').isString().withMessage('Dish ID must be a string'),
  body('target_texture')
    .isIn(['Regular', 'Minced', 'Pureed'])
    .withMessage('target_texture must be Regular, Minced, or Pureed')
]

export const checkResidentGroupVariantsSchema = [
  param('dish_id').isString().withMessage('Dish ID must be a string'),
  body('resident_ids').isArray().withMessage('resident_ids must be an array'),
  body('resident_ids.*').isString().withMessage('Each resident_id must be a string')
]

export const validateMenuNutritionSchema = [param('menu_id').isString().withMessage('Menu ID must be a string')]

export const calculateDishNutritionSchema = [
  param('dish_id').isString().notEmpty().withMessage('Dish ID must be a non-empty string'),
  query('servings').optional().isInt({ min: 1 }).withMessage('servings must be a positive integer')
]
