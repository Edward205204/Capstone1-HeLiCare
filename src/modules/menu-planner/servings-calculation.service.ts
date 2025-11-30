import { prisma } from '~/utils/db'
import { DietTagType, MealSlot } from '@prisma/client'
import { DetailedServingsBreakdown, NutritionSummary, MenuServingsBreakdown } from './menu-planner.dto'
import { nutritionValidatorService } from './nutrition-validator.service'

/**
 * Servings Calculation Service
 * Auto-calculates servings based on:
 * - Active residents (exclude leave/hospitalized)
 * - Diet tags breakdown
 * - Meal slot requirements
 */
export class ServingsCalculationService {
  /**
   * Calculate total servings for a meal slot
   * Total = Active Residents - Leave/Hospitalized
   */
  async calculateTotalServings(institution_id: string, date?: Date): Promise<number> {
    // Get all active residents (those with institution_id and no leave/hospitalized status)
    // Note: Currently Resident model doesn't have status field
    // For now, we count all residents with institution_id
    // TODO: Add status field to Resident model if needed
    const activeResidents = await prisma.resident.count({
      where: {
        institution_id
        // Future: add status filter when status field is added
        // status: { notIn: ['leave', 'hospitalized'] }
      }
    })

    return activeResidents
  }

  /**
   * Calculate servings breakdown by diet tag
   * Returns: { Regular: X, SoftTexture: Y, LowSugar: Z, ... }
   */
  async calculateServingsByDietTag(institution_id: string, date?: Date): Promise<Record<string, number>> {
    const residents = await prisma.resident.findMany({
      where: {
        institution_id
      },
      include: {
        dietTags: {
          where: {
            is_active: true,
            OR: [{ expires_at: null }, { expires_at: { gt: date || new Date() } }]
          }
        }
      }
    })

    const breakdown: Record<string, number> = {
      Regular: 0,
      SoftTexture: 0,
      LowSugar: 0,
      LowSodium: 0,
      GlutenFree: 0,
      LactoseFree: 0
    }

    for (const resident of residents) {
      const activeTags = resident.dietTags || []

      if (activeTags.length === 0) {
        // No special tags = Regular diet
        breakdown.Regular++
      } else {
        // Count by tag type
        for (const tag of activeTags) {
          switch (tag.tag_type) {
            case DietTagType.SoftTexture:
              breakdown.SoftTexture++
              break
            case DietTagType.LowSugar:
              breakdown.LowSugar++
              break
            case DietTagType.LowSodium:
              breakdown.LowSodium++
              break
            case DietTagType.GlutenFree:
              breakdown.GlutenFree++
              break
            case DietTagType.LactoseFree:
              breakdown.LactoseFree++
              break
          }
        }

        // If resident has special tags but no texture tag, they still need Regular texture
        const hasTextureTag = activeTags.some((t) => t.tag_type === DietTagType.SoftTexture)
        if (!hasTextureTag) {
          breakdown.Regular++
        }
      }
    }

    return breakdown
  }

  /**
   * Calculate servings for a specific dish based on diet tags
   * Returns the number of residents who should receive this dish
   */
  async calculateServingsForDish(
    institution_id: string,
    dish_id: string,
    meal_slot: MealSlot,
    date?: Date
  ): Promise<{
    total: number
    breakdown: Record<string, number>
    texture_breakdown: {
      Regular: number
      Minced: number
      Pureed: number
    }
  }> {
    const dish = await prisma.dish.findUnique({
      where: { dish_id },
      include: {
        dishIngredients: {
          include: {
            ingredient: true
          }
        }
      }
    })

    if (!dish) {
      throw new Error('Dish not found')
    }

    const residents = await prisma.resident.findMany({
      where: {
        institution_id
      },
      include: {
        dietTags: {
          where: {
            is_active: true,
            OR: [{ expires_at: null }, { expires_at: { gt: date || new Date() } }]
          }
        },
        allergies: true
      }
    })

    const breakdown: Record<string, number> = {}
    const textureBreakdown = {
      Regular: 0,
      Minced: 0,
      Pureed: 0
    }

    let total = 0

    for (const resident of residents) {
      // Check allergies first
      const hasAllergy = (resident.allergies || []).some((allergy) => {
        const substance = allergy.substance.toLowerCase()
        const dietaryFlags = (dish.dietary_flags as string[]) || []
        return dietaryFlags.some((flag) => flag.toLowerCase().includes(substance))
      })

      if (hasAllergy) {
        // Skip this resident - they have allergy
        continue
      }

      // Check if dish matches resident's diet tags
      const activeTags = resident.dietTags || []
      let isSuitable = true

      // Check Low Sugar requirement
      const needsLowSugar = activeTags.some((t) => t.tag_type === DietTagType.LowSugar)
      if (needsLowSugar && !dish.sugar_adjustable && !(dish.dietary_flags as string[])?.includes('diabetic')) {
        isSuitable = false
      }

      // Check Low Sodium requirement
      const needsLowSodium = activeTags.some((t) => t.tag_type === DietTagType.LowSodium)
      if (needsLowSodium && dish.sodium_level && dish.sodium_level > 500) {
        isSuitable = false
      }

      // Check Gluten Free requirement
      const needsGlutenFree = activeTags.some((t) => t.tag_type === DietTagType.GlutenFree)
      if (needsGlutenFree && !(dish.dietary_flags as string[])?.includes('gluten_free')) {
        isSuitable = false
      }

      // Check Lactose Free requirement
      const needsLactoseFree = activeTags.some((t) => t.tag_type === DietTagType.LactoseFree)
      if (needsLactoseFree && !(dish.dietary_flags as string[])?.includes('lactose_free')) {
        isSuitable = false
      }

      if (!isSuitable) {
        continue
      }

      // Determine texture requirement
      const needsSoftTexture = activeTags.some((t) => t.tag_type === DietTagType.SoftTexture)
      let requiredTexture = dish.texture

      if (needsSoftTexture) {
        // Resident needs soft texture
        if (dish.texture === 'Regular') {
          // Need to convert to Minced or Pureed
          // For now, default to Minced (can be overridden)
          requiredTexture = 'Minced'
        } else if (dish.texture === 'Minced') {
          requiredTexture = 'Minced'
        } else {
          requiredTexture = dish.texture
        }
      }

      // Count by texture
      if (requiredTexture === 'Regular') {
        textureBreakdown.Regular++
      } else if (requiredTexture === 'Minced') {
        textureBreakdown.Minced++
      } else if (requiredTexture === 'Pureed') {
        textureBreakdown.Pureed++
      }

      // Count by tag
      for (const tag of activeTags) {
        const tagName = tag.tag_name
        breakdown[tagName] = (breakdown[tagName] || 0) + 1
      }

      // If no tags, count as Regular
      if (activeTags.length === 0) {
        breakdown['Regular'] = (breakdown['Regular'] || 0) + 1
      }

      total++
    }

    return {
      total,
      breakdown,
      texture_breakdown: textureBreakdown
    }
  }

  /**
   * Get summary of servings calculation
   * Used for frontend display
   */
  async getServingsSummary(
    institution_id: string,
    date?: Date
  ): Promise<{
    total_residents: number
    total_servings: number
    breakdown_by_tag: Record<string, number>
    breakdown_by_texture: {
      Regular: number
      Minced: number
      Pureed: number
    }
    messages: string[]
  }> {
    const totalResidents = await this.calculateTotalServings(institution_id, date)
    const breakdownByTag = await this.calculateServingsByDietTag(institution_id, date)

    // Calculate texture breakdown
    const residents = await prisma.resident.findMany({
      where: {
        institution_id
      },
      include: {
        dietTags: {
          where: {
            is_active: true,
            OR: [{ expires_at: null }, { expires_at: { gt: date || new Date() } }]
          }
        }
      }
    })

    const textureBreakdown = {
      Regular: 0,
      Minced: 0,
      Pureed: 0
    }

    for (const resident of residents) {
      const hasSoftTexture = (resident.dietTags || []).some((t) => t.tag_type === DietTagType.SoftTexture)

      if (hasSoftTexture) {
        // Check severity to determine Minced vs Pureed
        // For now, default to Minced (can be enhanced)
        textureBreakdown.Minced++
      } else {
        textureBreakdown.Regular++
      }
    }

    // Generate informative messages
    const messages: string[] = []
    if (breakdownByTag.SoftTexture > 0) {
      messages.push(
        `${breakdownByTag.SoftTexture} out of ${totalResidents} meals converted to soft texture automatically.`
      )
    }
    if (breakdownByTag.LowSugar > 0) {
      messages.push(`${breakdownByTag.LowSugar} residents require low sugar diet.`)
    }
    if (breakdownByTag.LowSodium > 0) {
      messages.push(`${breakdownByTag.LowSodium} residents require low sodium diet.`)
    }

    return {
      total_residents: totalResidents,
      total_servings: totalResidents,
      breakdown_by_tag: breakdownByTag,
      breakdown_by_texture: textureBreakdown,
      messages
    }
  }

  /**
   * Calculate detailed servings breakdown for a specific dish
   * Includes regular servings, special servings (allergy-safe, low-sugar, low-sodium, soft texture),
   * nutrition breakdown, and ingredients breakdown
   */
  async calculateDetailedServingsBreakdown(
    institution_id: string,
    dish_id: string,
    meal_slot: MealSlot,
    date?: Date
  ): Promise<DetailedServingsBreakdown> {
    // Get dish with ingredients
    const dish = await prisma.dish.findUnique({
      where: { dish_id },
      include: {
        dishIngredients: {
          include: {
            ingredient: true
          }
        }
      }
    })

    if (!dish) {
      throw new Error('Dish not found')
    }

    // Get all residents with allergies and diet tags
    const residents = await prisma.resident.findMany({
      where: { institution_id },
      include: {
        allergies: true,
        dietTags: {
          where: {
            is_active: true,
            OR: [{ expires_at: null }, { expires_at: { gt: date || new Date() } }]
          }
        }
      }
    })

    const dietaryFlags = (dish.dietary_flags as string[]) || []
    const dishIngredients = dish.dishIngredients || []

    // Initialize breakdown structures
    const regularResidents: Array<{ resident_id: string; resident_name: string }> = []
    const allergySafeResidents: Array<{
      resident_id: string
      resident_name: string
      allergen_substance: string
      excluded_ingredient_ids: string[]
    }> = []
    const lowSugarResidents: Array<{ resident_id: string; resident_name: string }> = []
    const lowSodiumResidents: Array<{ resident_id: string; resident_name: string }> = []
    const softTextureResidents: Array<{
      resident_id: string
      resident_name: string
      required_texture: 'Minced' | 'Pureed'
    }> = []

    // Categorize residents
    for (const resident of residents) {
      const activeTags = resident.dietTags || []
      const allergies = resident.allergies || []

      // Check for allergies
      let hasAllergy = false
      let allergenSubstance = ''
      const excludedIngredientIds: string[] = []

      for (const allergy of allergies) {
        const substance = allergy.substance.toLowerCase()
        // Check if any ingredient matches this allergen
        for (const dishIng of dishIngredients) {
          const ingredientName = dishIng.ingredient.name.toLowerCase()
          if (ingredientName.includes(substance) || substance.includes(ingredientName)) {
            hasAllergy = true
            allergenSubstance = allergy.substance
            excludedIngredientIds.push(dishIng.ingredient_id)
          }
        }
        // Also check dietary flags
        if (dietaryFlags.some((flag) => flag.toLowerCase().includes(substance))) {
          hasAllergy = true
          allergenSubstance = allergy.substance
        }
      }

      if (hasAllergy) {
        allergySafeResidents.push({
          resident_id: resident.resident_id,
          resident_name: resident.full_name,
          allergen_substance: allergenSubstance,
          excluded_ingredient_ids: excludedIngredientIds
        })
        continue // Skip other checks for allergy residents
      }

      // Check diet tags
      const needsLowSugar = activeTags.some((t) => t.tag_type === DietTagType.LowSugar)
      const needsLowSodium = activeTags.some((t) => t.tag_type === DietTagType.LowSodium)
      const needsSoftTexture = activeTags.some((t) => t.tag_type === DietTagType.SoftTexture)

      // Check if dish is suitable for low sugar
      if (needsLowSugar && !dish.sugar_adjustable && !dietaryFlags.includes('diabetic')) {
        continue // Dish not suitable, skip
      }

      // Check if dish is suitable for low sodium
      if (needsLowSodium && dish.sodium_level && dish.sodium_level > 500) {
        continue // Dish not suitable, skip
      }

      // Determine texture requirement
      let requiredTexture: 'Minced' | 'Pureed' | null = null
      if (needsSoftTexture) {
        if (dish.texture === 'Regular') {
          requiredTexture = 'Minced' // Default to Minced
        } else if (dish.texture === 'Minced') {
          requiredTexture = 'Minced'
        } else if (dish.texture === 'Pureed') {
          requiredTexture = 'Pureed'
        }
      }

      // Categorize resident
      if (needsLowSugar) {
        lowSugarResidents.push({
          resident_id: resident.resident_id,
          resident_name: resident.full_name
        })
      }
      if (needsLowSodium) {
        lowSodiumResidents.push({
          resident_id: resident.resident_id,
          resident_name: resident.full_name
        })
      }
      if (requiredTexture) {
        softTextureResidents.push({
          resident_id: resident.resident_id,
          resident_name: resident.full_name,
          required_texture: requiredTexture
        })
      }

      // If no special requirements, it's regular
      if (!needsLowSugar && !needsLowSodium && !needsSoftTexture) {
        regularResidents.push({
          resident_id: resident.resident_id,
          resident_name: resident.full_name
        })
      }
    }

    // Calculate nutrition breakdown
    const calculateNutrition = (
      excludedIngredientIds: string[] = [],
      sugarReduction = 0,
      sodiumReduction = 0
    ): NutritionSummary => {
      let calories = 0
      let protein = 0
      let fat = 0
      let carbs = 0
      let fiber = 0
      let sodium = 0

      for (const dishIng of dishIngredients) {
        if (excludedIngredientIds.includes(dishIng.ingredient_id)) {
          continue // Skip excluded ingredients
        }

        const ing = dishIng.ingredient
        const amount = dishIng.amount
        const multiplier = amount / 100 // Convert to per-100g basis

        calories += (ing.calories_per_100g || 0) * multiplier
        protein += (ing.protein_per_100g || 0) * multiplier
        fat += (ing.fat_per_100g || 0) * multiplier
        carbs += (ing.carbs_per_100g || 0) * multiplier
        fiber += (ing.fiber_per_100g || 0) * multiplier
        sodium += (ing.sodium_per_100g || 0) * multiplier
      }

      // Apply reductions
      if (sugarReduction > 0) {
        carbs = carbs * (1 - sugarReduction / 100)
        calories = calories - carbs * 4 * (sugarReduction / 100) // Sugar is ~4 cal/g
      }
      if (sodiumReduction > 0) {
        sodium = sodium * (1 - sodiumReduction / 100)
      }

      return {
        calories: Math.round(calories * 100) / 100,
        protein: Math.round(protein * 100) / 100,
        fat: Math.round(fat * 100) / 100,
        carbs: Math.round(carbs * 100) / 100,
        fiber: fiber > 0 ? Math.round(fiber * 100) / 100 : undefined,
        sodium: sodium > 0 ? Math.round(sodium * 100) / 100 : undefined
      }
    }

    const regularNutrition = calculateNutrition()
    const allergySafeNutrition = calculateNutrition(
      Array.from(new Set(allergySafeResidents.flatMap((r) => r.excluded_ingredient_ids)))
    )
    const lowSugarNutrition = calculateNutrition([], 30) // 30% sugar reduction
    const lowSodiumNutrition = calculateNutrition([], 0, 50) // 50% sodium reduction

    // Calculate ingredients breakdown
    const regularIngredients = dishIngredients.map((di) => ({
      ingredient_id: di.ingredient_id,
      ingredient_name: di.ingredient.name,
      total_amount: di.amount * regularResidents.length,
      unit: di.ingredient.unit
    }))

    // Get unique excluded ingredients for allergy-safe
    const allExcludedIngredientIds = Array.from(new Set(allergySafeResidents.flatMap((r) => r.excluded_ingredient_ids)))

    const specialModifications = []

    if (allExcludedIngredientIds.length > 0) {
      const excludedIngredients = dishIngredients
        .filter((di) => allExcludedIngredientIds.includes(di.ingredient_id))
        .map((di) => ({
          ingredient_id: di.ingredient_id,
          ingredient_name: di.ingredient.name
        }))

      specialModifications.push({
        modification_type: 'allergy_safe' as const,
        excluded_ingredients: excludedIngredients,
        adjusted_ingredients: []
      })
    }

    if (lowSugarResidents.length > 0) {
      const adjustedIngredients = dishIngredients.map((di) => ({
        ingredient_id: di.ingredient_id,
        ingredient_name: di.ingredient.name,
        original_amount: di.amount,
        adjusted_amount: di.amount * 0.7, // 30% reduction
        unit: di.ingredient.unit,
        reason: 'Reduced sugar content for low-sugar diet'
      }))

      specialModifications.push({
        modification_type: 'low_sugar' as const,
        excluded_ingredients: [],
        adjusted_ingredients: adjustedIngredients
      })
    }

    if (lowSodiumResidents.length > 0) {
      const adjustedIngredients = dishIngredients
        .filter((di) => (di.ingredient.sodium_per_100g || 0) > 0)
        .map((di) => ({
          ingredient_id: di.ingredient_id,
          ingredient_name: di.ingredient.name,
          original_amount: di.amount,
          adjusted_amount: di.amount * 0.5, // 50% reduction
          unit: di.ingredient.unit,
          reason: 'Reduced sodium content for low-sodium diet'
        }))

      specialModifications.push({
        modification_type: 'low_sodium' as const,
        excluded_ingredients: [],
        adjusted_ingredients: adjustedIngredients
      })
    }

    // Count texture breakdown
    const mincedCount = softTextureResidents.filter((r) => r.required_texture === 'Minced').length
    const pureedCount = softTextureResidents.filter((r) => r.required_texture === 'Pureed').length

    return {
      dish_id: dish.dish_id,
      dish_name: dish.name,
      total_servings:
        regularResidents.length +
        allergySafeResidents.length +
        lowSugarResidents.length +
        lowSodiumResidents.length +
        softTextureResidents.length,
      regular_servings: regularResidents.length,
      special_servings: {
        allergy_safe: {
          count: allergySafeResidents.length,
          excluded_ingredients: allExcludedIngredientIds.map((ingId) => {
            const dishIng = dishIngredients.find((di) => di.ingredient_id === ingId)
            return {
              ingredient_id: ingId,
              ingredient_name: dishIng?.ingredient.name || 'Unknown',
              reason: 'Allergen - must be excluded'
            }
          }),
          affected_residents: allergySafeResidents.map((r) => ({
            resident_id: r.resident_id,
            resident_name: r.resident_name,
            allergen_substance: r.allergen_substance
          }))
        },
        low_sugar: {
          count: lowSugarResidents.length,
          affected_residents: lowSugarResidents,
          sugar_reduction_percentage: 30
        },
        low_sodium: {
          count: lowSodiumResidents.length,
          affected_residents: lowSodiumResidents,
          sodium_reduction_percentage: 50
        },
        soft_texture: {
          minced: mincedCount,
          pureed: pureedCount,
          affected_residents: softTextureResidents
        }
      },
      nutrition_breakdown: {
        regular: regularNutrition,
        allergy_safe: allergySafeNutrition,
        low_sugar: lowSugarNutrition,
        low_sodium: lowSodiumNutrition
      },
      ingredients_breakdown: {
        regular: regularIngredients,
        special_modifications: specialModifications
      }
    }
  }

  /**
   * Calculate detailed servings breakdown for all dishes in a menu
   * Returns comprehensive breakdown with nutrition summary for each dish
   */
  async calculateMenuServingsBreakdown(menu_id: string, institution_id: string): Promise<MenuServingsBreakdown> {
    // Get menu with dishes
    const menu = await prisma.weeklyMenu.findUnique({
      where: { menu_id },
      include: {
        menuItems: {
          include: {
            dish: true
          }
        }
      }
    })

    if (!menu) {
      throw new Error('Menu not found')
    }

    if (menu.institution_id !== institution_id) {
      throw new Error('Menu does not belong to this institution')
    }

    // Get total residents
    const totalResidents = await this.calculateTotalServings(institution_id, menu.week_start_date)

    // Calculate breakdown for each dish
    const dishBreakdowns = await Promise.all(
      menu.menuItems.map(async (menuItem) => {
        const detailedBreakdown = await this.calculateDetailedServingsBreakdown(
          institution_id,
          menuItem.dish_id,
          menuItem.meal_slot,
          menu.week_start_date
        )

        // Calculate nutrition summary for this dish with actual servings
        const nutritionSummary = await nutritionValidatorService.calculateDishNutrition(
          menuItem.dish_id,
          menuItem.servings
        )

        return {
          dish_id: menuItem.dish_id,
          dish_name: menuItem.dish.name,
          meal_slot: menuItem.meal_slot,
          day_of_week: menuItem.day_of_week,
          servings: menuItem.servings,
          detailed_breakdown: detailedBreakdown,
          nutrition_summary: nutritionSummary
        }
      })
    )

    // Calculate summary totals
    const summary = {
      total_regular_servings: dishBreakdowns.reduce((sum, d) => sum + d.detailed_breakdown.regular_servings, 0),
      total_allergy_safe_servings: dishBreakdowns.reduce(
        (sum, d) => sum + d.detailed_breakdown.special_servings.allergy_safe.count,
        0
      ),
      total_low_sugar_servings: dishBreakdowns.reduce(
        (sum, d) => sum + d.detailed_breakdown.special_servings.low_sugar.count,
        0
      ),
      total_low_sodium_servings: dishBreakdowns.reduce(
        (sum, d) => sum + d.detailed_breakdown.special_servings.low_sodium.count,
        0
      ),
      total_minced_servings: dishBreakdowns.reduce(
        (sum, d) => sum + d.detailed_breakdown.special_servings.soft_texture.minced,
        0
      ),
      total_pureed_servings: dishBreakdowns.reduce(
        (sum, d) => sum + d.detailed_breakdown.special_servings.soft_texture.pureed,
        0
      ),
      total_nutrition: dishBreakdowns.reduce(
        (acc, d) => ({
          calories: acc.calories + d.nutrition_summary.calories,
          protein: acc.protein + d.nutrition_summary.protein,
          fat: acc.fat + d.nutrition_summary.fat,
          carbs: acc.carbs + d.nutrition_summary.carbs,
          fiber: (acc.fiber || 0) + (d.nutrition_summary.fiber || 0),
          sodium: (acc.sodium || 0) + (d.nutrition_summary.sodium || 0)
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 }
      )
    }

    return {
      menu_id: menu.menu_id,
      week_start_date: menu.week_start_date,
      total_residents: totalResidents,
      dishes: dishBreakdowns,
      summary
    }
  }
}

export const servingsCalculationService = new ServingsCalculationService()
