import { DishTexture, MealSlot, IngredientUnit } from '@prisma/client'

export interface CreateDishParams {
  institution_id: string
  name: string
  calories_per_100g: number
  texture: DishTexture
  sugar_adjustable: boolean
  sodium_level?: number
  dietary_flags?: string[]
  is_blendable: boolean
  ingredients: {
    ingredient_id: string
    amount: number
  }[]
}

export interface UpdateDishParams {
  dish_id: string
  institution_id: string
  name?: string
  calories_per_100g?: number
  texture?: DishTexture
  sugar_adjustable?: boolean
  sodium_level?: number
  dietary_flags?: string[]
  is_blendable?: boolean
  ingredients?: {
    ingredient_id: string
    amount: number
  }[]
}

export interface CreateIngredientParams {
  institution_id: string
  name: string
  unit: IngredientUnit
  calories_per_100g: number
  protein_per_100g?: number
  fat_per_100g?: number
  carbs_per_100g?: number
  fiber_per_100g?: number
  sodium_per_100g?: number
}

export interface UpdateIngredientParams {
  ingredient_id: string
  institution_id: string
  name?: string
  unit?: IngredientUnit
  calories_per_100g?: number
  protein_per_100g?: number
  fat_per_100g?: number
  carbs_per_100g?: number
  fiber_per_100g?: number
  sodium_per_100g?: number
}

export interface CreateWeeklyMenuParams {
  institution_id: string
  week_start_date: Date
  created_by_id: string
  menuItems: {
    dish_id: string
    meal_slot: MealSlot
    day_of_week: number // 0 = Monday, 6 = Sunday
    servings: number
    texture_variant?: DishTexture
  }[]
}

export interface UpdateWeeklyMenuParams {
  menu_id: string
  institution_id: string
  menuItems: {
    dish_id: string
    meal_slot: MealSlot
    day_of_week: number
    servings: number
    texture_variant?: DishTexture
  }[]
}

export interface CopyWeekMenuParams {
  institution_id: string
  source_week_start_date: Date
  target_week_start_date: Date
  created_by_id: string
  adjust_servings?: boolean // Auto-adjust based on current resident count
}

export interface GetDishSuggestionsParams {
  institution_id: string
  resident_id: string
  meal_slot?: MealSlot
  day_of_week?: number
}

export interface GetDishSuggestionsByTagsParams {
  institution_id: string
  diet_tags?: string[] // Array of DietTagType values
  meal_slot?: MealSlot
  exclude_allergens?: string[] // Array of allergen substances to exclude
}

export interface NutritionSummary {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber?: number
  sodium?: number
}

export interface MenuNutritionValidation {
  day_of_week: number
  meal_slot: MealSlot
  summary: NutritionSummary
  warnings: string[]
  recommendations: string[]
}

export interface WeeklyMenuNutritionReport {
  week_start_date: Date
  week_end_date: Date
  daily_summaries: {
    day_of_week: number
    day_name: string
    total_calories: number
    total_protein: number
    total_fat: number
    total_carbs: number
    meal_slots: MenuNutritionValidation[]
  }[]
  weekly_average: NutritionSummary
  warnings: string[]
  recommendations: string[]
}

export interface AutoVariantResult {
  success: boolean
  original_texture: DishTexture
  target_texture: DishTexture
  variant_dish_id?: string
  error?: string
  warning?: string
}

export interface ResidentGroupVariantCheck {
  resident_id: string
  resident_name: string
  required_texture: DishTexture
  variant_result: AutoVariantResult
}

export interface DishAllergyWarning {
  dish_id: string
  dish_name: string
  affected_residents: Array<{
    resident_id: string
    resident_name: string
    allergen_substance: string
  }>
  total_affected: number
  suggested_alternatives?: Array<{
    dish_id: string
    dish_name: string
    reason: string
  }>
  special_portions_needed: {
    allergy_safe: number
    low_sugar: number
    low_sodium: number
    soft_texture: number
    pureed: number
  }
}

export interface DetailedServingsBreakdown {
  dish_id: string
  dish_name: string
  total_servings: number
  regular_servings: number
  special_servings: {
    allergy_safe: {
      count: number
      excluded_ingredients: Array<{
        ingredient_id: string
        ingredient_name: string
        reason: string
      }>
      affected_residents: Array<{
        resident_id: string
        resident_name: string
        allergen_substance: string
      }>
    }
    low_sugar: {
      count: number
      affected_residents: Array<{
        resident_id: string
        resident_name: string
      }>
      sugar_reduction_percentage?: number
    }
    low_sodium: {
      count: number
      affected_residents: Array<{
        resident_id: string
        resident_name: string
      }>
      sodium_reduction_percentage?: number
    }
    soft_texture: {
      minced: number
      pureed: number
      affected_residents: Array<{
        resident_id: string
        resident_name: string
        required_texture: 'Minced' | 'Pureed'
      }>
    }
  }
  nutrition_breakdown: {
    regular: NutritionSummary
    allergy_safe: NutritionSummary
    low_sugar: NutritionSummary
    low_sodium: NutritionSummary
  }
  ingredients_breakdown: {
    regular: Array<{
      ingredient_id: string
      ingredient_name: string
      total_amount: number
      unit: string
    }>
    special_modifications: Array<{
      modification_type: 'allergy_safe' | 'low_sugar' | 'low_sodium'
      excluded_ingredients: Array<{
        ingredient_id: string
        ingredient_name: string
      }>
      adjusted_ingredients: Array<{
        ingredient_id: string
        ingredient_name: string
        original_amount: number
        adjusted_amount: number
        unit: string
        reason: string
      }>
    }>
  }
}

export interface MenuServingsBreakdown {
  menu_id: string
  week_start_date: Date
  total_residents: number
  dishes: Array<{
    dish_id: string
    dish_name: string
    meal_slot: MealSlot
    day_of_week: number
    servings: number
    detailed_breakdown: DetailedServingsBreakdown
    nutrition_summary: NutritionSummary
  }>
  summary: {
    total_regular_servings: number
    total_allergy_safe_servings: number
    total_low_sugar_servings: number
    total_low_sodium_servings: number
    total_minced_servings: number
    total_pureed_servings: number
    total_nutrition: NutritionSummary
  }
}
