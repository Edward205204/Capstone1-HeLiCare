import { prisma } from '~/utils/db'
import { MealSlot } from '@prisma/client'
import { NutritionSummary, MenuNutritionValidation, WeeklyMenuNutritionReport } from './menu-planner.dto'

/**
 * Nutrition Validator Service
 * Computes calories, protein, fat, carbs per day and per slot
 */
export class NutritionValidatorService {
  /**
   * Calculate nutrition summary for a dish
   */
  async calculateDishNutrition(dish_id: string, servings: number = 1): Promise<NutritionSummary> {
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

    // Calculate total weight per serving (assuming 100g per serving)
    const totalWeightPerServing = 100 // grams
    const totalWeight = totalWeightPerServing * servings

    let totalCalories = 0
    let totalProtein = 0
    let totalFat = 0
    let totalCarbs = 0
    let totalFiber = 0
    let totalSodium = 0

    // Calculate from ingredients
    for (const di of dish.dishIngredients) {
      const ingredient = di.ingredient
      const amountInGrams = di.amount // Already in grams/ml/pcs

      // Convert to grams if needed
      let amountInGramsForCalc = amountInGrams
      if (ingredient.unit === 'ml') {
        // Assume 1ml ≈ 1g for most liquids
        amountInGramsForCalc = amountInGrams
      } else if (ingredient.unit === 'pcs') {
        // For pieces, we need to estimate weight - using average
        // This is a simplification, in production you'd have weight per piece
        amountInGramsForCalc = amountInGrams * 50 // Assume 50g per piece average
      }

      const ratio = amountInGramsForCalc / 100 // Ratio to 100g

      totalCalories += ingredient.calories_per_100g * ratio
      totalProtein += ingredient.protein_per_100g * ratio
      totalFat += ingredient.fat_per_100g * ratio
      totalCarbs += ingredient.carbs_per_100g * ratio
      totalFiber += (ingredient.fiber_per_100g || 0) * ratio
      totalSodium += (ingredient.sodium_per_100g || 0) * ratio
    }

    // If no ingredients, use dish-level calories
    if (dish.dishIngredients.length === 0) {
      totalCalories = dish.calories_per_100g * (totalWeight / 100)
    }

    // Scale by servings
    return {
      calories: Math.round(totalCalories * servings),
      protein: Math.round(totalProtein * servings * 10) / 10,
      fat: Math.round(totalFat * servings * 10) / 10,
      carbs: Math.round(totalCarbs * servings * 10) / 10,
      fiber: Math.round(totalFiber * servings * 10) / 10,
      sodium: Math.round(totalSodium * servings * 10) / 10
    }
  }

  /**
   * Validate nutrition for a meal slot
   */
  async validateMealSlotNutrition(
    menu_id: string,
    day_of_week: number,
    meal_slot: MealSlot
  ): Promise<MenuNutritionValidation> {
    const menuItems = await prisma.weeklyMenuItem.findMany({
      where: {
        menu_id,
        day_of_week,
        meal_slot
      },
      include: {
        dish: true
      }
    })

    let totalCalories = 0
    let totalProtein = 0
    let totalFat = 0
    let totalCarbs = 0
    let totalFiber = 0
    let totalSodium = 0

    const warnings: string[] = []
    const recommendations: string[] = []

    for (const item of menuItems) {
      const nutrition = await this.calculateDishNutrition(item.dish_id, item.servings)
      totalCalories += nutrition.calories
      totalProtein += nutrition.protein
      totalFat += nutrition.fat
      totalCarbs += nutrition.carbs
      totalFiber += nutrition.fiber || 0
      totalSodium += nutrition.sodium || 0
    }

    // Nutrition guidelines (per meal slot)
    const slotGuidelines: Record<MealSlot, { calories: { min: number; max: number }; protein: { min: number } }> = {
      Breakfast: { calories: { min: 300, max: 500 }, protein: { min: 15 } },
      Lunch: { calories: { min: 500, max: 800 }, protein: { min: 25 } },
      Afternoon: { calories: { min: 100, max: 300 }, protein: { min: 5 } },
      Dinner: { calories: { min: 400, max: 700 }, protein: { min: 20 } }
    }

    const guidelines = slotGuidelines[meal_slot]

    if (totalCalories < guidelines.calories.min) {
      warnings.push(`${meal_slot}: Calories too low (${totalCalories} < ${guidelines.calories.min})`)
      recommendations.push(`Increase portion size or add more dishes for ${meal_slot}`)
    }

    if (totalCalories > guidelines.calories.max) {
      warnings.push(`${meal_slot}: Calories too high (${totalCalories} > ${guidelines.calories.max})`)
      recommendations.push(`Reduce portion size or remove some dishes for ${meal_slot}`)
    }

    if (totalProtein < guidelines.protein.min) {
      warnings.push(`${meal_slot}: Protein too low (${totalProtein}g < ${guidelines.protein.min}g)`)
      recommendations.push(`Add protein-rich dishes for ${meal_slot}`)
    }

    if (totalSodium > 1000) {
      warnings.push(`${meal_slot}: Sodium too high (${totalSodium}mg > 1000mg)`)
      recommendations.push(`Reduce sodium content for ${meal_slot}`)
    }

    return {
      day_of_week,
      meal_slot,
      summary: {
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fiber: Math.round(totalFiber * 10) / 10,
        sodium: Math.round(totalSodium * 10) / 10
      },
      warnings,
      recommendations
    }
  }

  /**
   * Generate weekly nutrition report
   * Can accept either menu_id (for querying) or menu object (for use in transaction)
   */
  async generateWeeklyNutritionReport(menu_idOrMenu: string | any): Promise<WeeklyMenuNutritionReport> {
    let menu: any

    // If menu object is passed, use it directly (for transaction context)
    if (typeof menu_idOrMenu === 'object' && menu_idOrMenu.menu_id) {
      menu = menu_idOrMenu
    } else {
      // If menu_id string is passed, query from DB
      const menu_id = menu_idOrMenu as string
      menu = await prisma.weeklyMenu.findUnique({
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
    }

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const mealSlots: MealSlot[] = ['Breakfast', 'Lunch', 'Afternoon', 'Dinner']

    const dailySummaries = []

    for (let day = 0; day < 7; day++) {
      const mealSlotValidations: MenuNutritionValidation[] = []

      for (const slot of mealSlots) {
        const validation = await this.validateMealSlotNutrition(menu.menu_id, day, slot)
        mealSlotValidations.push(validation)
      }

      // Calculate daily totals
      const dailyTotal = mealSlotValidations.reduce(
        (acc, val) => ({
          calories: acc.calories + val.summary.calories,
          protein: acc.protein + val.summary.protein,
          fat: acc.fat + val.summary.fat,
          carbs: acc.carbs + val.summary.carbs,
          fiber: (acc.fiber || 0) + (val.summary.fiber || 0),
          sodium: (acc.sodium || 0) + (val.summary.sodium || 0)
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 }
      )

      dailySummaries.push({
        day_of_week: day,
        day_name: dayNames[day],
        total_calories: dailyTotal.calories,
        total_protein: dailyTotal.protein,
        total_fat: dailyTotal.fat,
        total_carbs: dailyTotal.carbs,
        meal_slots: mealSlotValidations
      })
    }

    // Calculate weekly average
    const weeklyTotal = dailySummaries.reduce(
      (acc, day) => ({
        calories: acc.calories + day.total_calories,
        protein: acc.protein + day.total_protein,
        fat: acc.fat + day.total_fat,
        carbs: acc.carbs + day.total_carbs
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    )

    const weeklyAverage: NutritionSummary = {
      calories: Math.round(weeklyTotal.calories / 7),
      protein: Math.round((weeklyTotal.protein / 7) * 10) / 10,
      fat: Math.round((weeklyTotal.fat / 7) * 10) / 10,
      carbs: Math.round((weeklyTotal.carbs / 7) * 10) / 10
    }

    // Collect all warnings and recommendations
    const allWarnings: string[] = []
    const allRecommendations: string[] = []

    dailySummaries.forEach((day) => {
      day.meal_slots.forEach((slot) => {
        allWarnings.push(...slot.warnings)
        allRecommendations.push(...slot.recommendations)
      })
    })

    return {
      week_start_date: menu.week_start_date,
      week_end_date: menu.week_end_date,
      daily_summaries: dailySummaries,
      weekly_average: weeklyAverage,
      warnings: [...new Set(allWarnings)],
      recommendations: [...new Set(allRecommendations)]
    }
  }
}

export const nutritionValidatorService = new NutritionValidatorService()
