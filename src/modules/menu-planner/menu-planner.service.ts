import { prisma } from '~/utils/db'
import { DishTexture, MealSlot } from '@prisma/client'
import {
  CreateDishParams,
  UpdateDishParams,
  CreateIngredientParams,
  UpdateIngredientParams,
  CreateWeeklyMenuParams,
  CopyWeekMenuParams,
  GetDishSuggestionsParams,
  GetDishSuggestionsByTagsParams
} from './menu-planner.dto'
import { autoVariantEngine } from './auto-variant.engine'
import { nutritionValidatorService } from './nutrition-validator.service'
import { servingsCalculationService } from './servings-calculation.service'

class MenuPlannerService {
  constructor() {}

  async createDish(params: CreateDishParams) {
    const { institution_id, ingredients, ...dishData } = params

    const dish = await prisma.dish.create({
      data: {
        institution_id,
        ...dishData,
        dishIngredients: {
          create: ingredients.map((ing) => ({
            ingredient_id: ing.ingredient_id,
            amount: ing.amount
          }))
        }
      },
      include: {
        dishIngredients: {
          include: {
            ingredient: true
          }
        }
      }
    })

    return dish
  }

  async updateDish(params: UpdateDishParams) {
    const { dish_id, ingredients, ...updateData } = params

    // Update dish
    await prisma.dish.update({
      where: { dish_id },
      data: updateData
    })

    // Update ingredients if provided
    if (ingredients) {
      // Delete existing ingredients
      await prisma.dishIngredient.deleteMany({
        where: { dish_id }
      })

      // Create new ingredients
      await prisma.dishIngredient.createMany({
        data: ingredients.map((ing) => ({
          dish_id,
          ingredient_id: ing.ingredient_id,
          amount: ing.amount
        }))
      })
    }

    return prisma.dish.findUnique({
      where: { dish_id },
      include: {
        dishIngredients: {
          include: {
            ingredient: true
          }
        }
      }
    })
  }

  async getDishes(institution_id: string, texture?: DishTexture) {
    return prisma.dish.findMany({
      where: {
        institution_id,
        ...(texture && { texture })
      },
      include: {
        dishIngredients: {
          include: {
            ingredient: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })
  }

  async getDishById(dish_id: string, institution_id: string) {
    return prisma.dish.findFirst({
      where: {
        dish_id,
        institution_id
      },
      include: {
        dishIngredients: {
          include: {
            ingredient: true
          }
        }
      }
    })
  }

  async deleteDish(dish_id: string, institution_id: string) {
    return prisma.dish.deleteMany({
      where: {
        dish_id,
        institution_id
      }
    })
  }

  // ========== INGREDIENT METHODS ==========
  async createIngredient(params: CreateIngredientParams) {
    return prisma.ingredient.create({
      data: params
    })
  }

  async updateIngredient(params: UpdateIngredientParams) {
    const { ingredient_id, ...updateData } = params
    return prisma.ingredient.update({
      where: { ingredient_id },
      data: updateData
    })
  }

  async getIngredients(institution_id: string) {
    return prisma.ingredient.findMany({
      where: { institution_id },
      orderBy: { name: 'asc' }
    })
  }

  async getIngredientById(ingredient_id: string, institution_id: string) {
    return prisma.ingredient.findFirst({
      where: {
        ingredient_id,
        institution_id
      }
    })
  }

  async deleteIngredient(ingredient_id: string, institution_id: string) {
    return prisma.ingredient.deleteMany({
      where: {
        ingredient_id,
        institution_id
      }
    })
  }

  // ========== WEEKLY MENU METHODS ==========
  async createWeeklyMenu(params: CreateWeeklyMenuParams) {
    const { institution_id, week_start_date, created_by_id, menuItems } = params

    // Calculate week_end_date (Sunday)
    const weekEndDate = new Date(week_start_date)
    weekEndDate.setDate(weekEndDate.getDate() + 6)

    // Use transaction for ACID compliance
    return prisma.$transaction(async (tx) => {
      // Check if menu already exists for this week
      const existing = await tx.weeklyMenu.findUnique({
        where: {
          institution_id_week_start_date: {
            institution_id,
            week_start_date
          }
        }
      })

      // If menu exists, update it instead of creating new one
      if (existing) {
        // Delete existing menu items first
        await tx.weeklyMenuItem.deleteMany({
          where: { menu_id: existing.menu_id }
        })
      }

      // Auto-calculate servings if not provided
      const menuItemsWithServings = await Promise.all(
        menuItems.map(async (item) => {
          let servings = item.servings

          // If servings not provided or 0, auto-calculate
          if (!servings || servings === 0) {
            const calculation = await servingsCalculationService.calculateServingsForDish(
              institution_id,
              item.dish_id,
              item.meal_slot,
              week_start_date
            )
            servings = calculation.total
          }

          return {
            ...item,
            servings
          }
        })
      )

      // Create or update menu
      const menu = existing
        ? await tx.weeklyMenu.update({
            where: { menu_id: existing.menu_id },
            data: {
              menuItems: {
                create: menuItemsWithServings.map((item) => ({
                  dish_id: item.dish_id,
                  meal_slot: item.meal_slot,
                  day_of_week: item.day_of_week,
                  servings: item.servings,
                  texture_variant: item.texture_variant
                }))
              }
            },
            include: {
              menuItems: {
                include: {
                  dish: true
                }
              }
            }
          })
        : await tx.weeklyMenu.create({
            data: {
              institution_id,
              week_start_date,
              week_end_date: weekEndDate,
              created_by_id,
              menuItems: {
                create: menuItemsWithServings.map((item) => ({
                  dish_id: item.dish_id,
                  meal_slot: item.meal_slot,
                  day_of_week: item.day_of_week,
                  servings: item.servings,
                  texture_variant: item.texture_variant
                }))
              }
            },
            include: {
              menuItems: {
                include: {
                  dish: true
                }
              }
            }
          })

      // Validate nutrition - pass menu object directly to avoid querying before transaction commits
      const nutritionReport = await nutritionValidatorService.generateWeeklyNutritionReport(menu)

      return {
        menu,
        nutrition_report: nutritionReport,
        wasUpdate: !!existing // Indicate if this was an update or create
      }
    })
  }

  async copyWeekMenu(params: CopyWeekMenuParams) {
    const { institution_id, source_week_start_date, target_week_start_date, created_by_id, adjust_servings } = params

    return prisma.$transaction(async (tx) => {
      // Get source menu
      const sourceMenu = await tx.weeklyMenu.findUnique({
        where: {
          institution_id_week_start_date: {
            institution_id,
            week_start_date: source_week_start_date
          }
        },
        include: {
          menuItems: {
            include: {
              dish: true
            }
          }
        }
      })

      if (!sourceMenu) {
        throw new Error('Source menu not found')
      }

      // Check if target menu already exists
      const existing = await tx.weeklyMenu.findUnique({
        where: {
          institution_id_week_start_date: {
            institution_id,
            week_start_date: target_week_start_date
          }
        }
      })

      if (existing) {
        throw new Error('Menu already exists for target week')
      }

      // Get current resident count if adjusting servings
      let servingMultiplier = 1
      if (adjust_servings) {
        const currentResidentCount = await tx.resident.count({
          where: { institution_id }
        })
        const sourceResidentCount = await tx.resident.count({
          where: {
            institution_id,
            created_at: { lte: source_week_start_date }
          }
        })
        if (sourceResidentCount > 0) {
          servingMultiplier = currentResidentCount / sourceResidentCount
        }
      }

      // Calculate target week_end_date
      const targetWeekEndDate = new Date(target_week_start_date)
      targetWeekEndDate.setDate(targetWeekEndDate.getDate() + 6)

      // Create new menu
      const newMenu = await tx.weeklyMenu.create({
        data: {
          institution_id,
          week_start_date: target_week_start_date,
          week_end_date: targetWeekEndDate,
          created_by_id,
          menuItems: {
            create: sourceMenu.menuItems.map((item) => ({
              dish_id: item.dish_id,
              meal_slot: item.meal_slot,
              day_of_week: item.day_of_week,
              servings: Math.round(item.servings * servingMultiplier),
              texture_variant: item.texture_variant
            }))
          }
        },
        include: {
          menuItems: {
            include: {
              dish: true
            }
          }
        }
      })

      return newMenu
    })
  }

  async getWeeklyMenu(menu_id: string, institution_id: string) {
    return prisma.weeklyMenu.findFirst({
      where: {
        menu_id,
        institution_id
      },
      include: {
        menuItems: {
          include: {
            dish: {
              include: {
                dishIngredients: {
                  include: {
                    ingredient: true
                  }
                }
              }
            }
          }
        },
        created_by: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      }
    })
  }

  async getWeeklyMenuByWeek(institution_id: string, week_start_date: Date) {
    console.log('=== getWeeklyMenuByWeek SERVICE DEBUG ===')
    console.log('institution_id:', institution_id)
    console.log('week_start_date input:', week_start_date)
    console.log('week_start_date ISO:', week_start_date.toISOString())
    console.log('week_start_date Date only:', week_start_date.toISOString().split('T')[0])

    // Normalize to date only using UTC to avoid timezone issues
    // Extract date string and create new Date at midnight UTC
    const dateStr = week_start_date.toISOString().split('T')[0] // e.g., "2025-11-17"
    const dateOnly = new Date(dateStr + 'T00:00:00.000Z')
    console.log('dateOnly normalized (UTC):', dateOnly.toISOString())
    console.log('dateOnly Date only:', dateOnly.toISOString().split('T')[0])

    // Try to find menu with exact date match
    console.log('Querying database with:', {
      institution_id,
      week_start_date: dateOnly
    })

    const menu = await prisma.weeklyMenu.findUnique({
      where: {
        institution_id_week_start_date: {
          institution_id,
          week_start_date: dateOnly
        }
      },
      include: {
        menuItems: {
          include: {
            dish: {
              include: {
                dishIngredients: {
                  include: {
                    ingredient: true
                  }
                }
              }
            }
          }
        }
      }
    })

    console.log('Menu query result:', menu ? 'FOUND' : 'NOT FOUND')
    if (menu) {
      console.log('Menu ID:', menu.menu_id)
      console.log('Menu week_start_date:', menu.week_start_date)
    } else {
      // Try to find any menu for this institution to debug
      const anyMenu = await prisma.weeklyMenu.findFirst({
        where: { institution_id },
        orderBy: { week_start_date: 'desc' },
        take: 1
      })
      console.log('Any menu for this institution:', anyMenu ? 'YES' : 'NO')
      if (anyMenu) {
        console.log('Sample menu week_start_date:', anyMenu.week_start_date)
        console.log('Sample menu week_start_date ISO:', anyMenu.week_start_date.toISOString())
        console.log('Sample menu week_start_date Date only:', anyMenu.week_start_date.toISOString().split('T')[0])
        console.log('Comparing:', {
          queryDate: dateOnly.toISOString().split('T')[0],
          dbDate: anyMenu.week_start_date.toISOString().split('T')[0]
        })
      } else {
        // Check if there are any menus at all
        const allMenus = await prisma.weeklyMenu.findMany({
          take: 5,
          orderBy: { week_start_date: 'desc' }
        })
        console.log('Total menus in database:', allMenus.length)
        if (allMenus.length > 0) {
          console.log('Sample menus from other institutions:')
          allMenus.forEach((m, i) => {
            console.log(
              `  Menu ${i + 1}: institution=${m.institution_id}, week_start=${m.week_start_date.toISOString().split('T')[0]}`
            )
          })
        }
      }
    }

    console.log('=== END SERVICE DEBUG ===')
    return menu
  }

  async getWeeklyMenus(institution_id: string, take: number = 10, skip: number = 0) {
    const menus = await prisma.weeklyMenu.findMany({
      where: { institution_id },
      take,
      skip,
      orderBy: { week_start_date: 'desc' },
      include: {
        created_by: {
          select: {
            user_id: true,
            email: true,
            staffProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        menuItems: {
          include: {
            dish: true
          }
        }
      }
    })

    const total = await prisma.weeklyMenu.count({
      where: { institution_id }
    })

    return { data: menus, total }
  }

  async deleteWeeklyMenu(menu_id: string, institution_id: string) {
    return prisma.$transaction(async (tx) => {
      const menu = await tx.weeklyMenu.findUnique({
        where: { menu_id }
      })

      if (!menu) {
        throw new Error('Menu not found')
      }

      if (menu.institution_id !== institution_id) {
        throw new Error('Menu does not belong to this institution')
      }

      // Delete menu items first (cascade)
      await tx.weeklyMenuItem.deleteMany({
        where: { menu_id }
      })

      // Delete menu
      await tx.weeklyMenu.delete({
        where: { menu_id }
      })

      return { success: true }
    })
  }

  // ========== DISH SUGGESTIONS ==========
  async getDishSuggestions(params: GetDishSuggestionsParams) {
    const { institution_id, resident_id } = params

    // Get resident profile with diet tags
    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      include: {
        allergies: true,
        chronicDiseases: {
          where: {
            status: 'ACTIVE'
          }
        },
        dietTags: {
          where: {
            is_active: true
          }
        }
      }
    })

    if (!resident || resident.institution_id !== institution_id) {
      throw new Error('Resident not found')
    }

    // Get all dishes
    const allDishes = await this.getDishes(institution_id)

    // Filter dishes based on allergies
    const allergySubstances = (resident.allergies || []).map((a: { substance: string }) => a.substance.toLowerCase())
    const filteredDishes = allDishes.filter((dish) => {
      // Check dietary flags for allergens
      const dietaryFlags = (dish.dietary_flags as string[]) || []
      return !dietaryFlags.some((flag) => allergySubstances.includes(flag.toLowerCase()))
    })

    // Get active diet tags
    const activeTags = (resident.dietTags || []).map((t) => t.tag_type)

    // Score dishes based on diet tags and conditions
    const scoredDishes = filteredDishes.map((dish) => {
      let score = 0
      const dietaryFlags = (dish.dietary_flags as string[]) || []

      // Check Low Sugar requirement
      if (activeTags.includes('LowSugar')) {
        if (dish.sugar_adjustable) {
          score += 10
        }
        if (dietaryFlags.includes('diabetic') || dietaryFlags.includes('low_sugar')) {
          score += 20
        }
      }

      // Check Low Sodium requirement
      if (activeTags.includes('LowSodium')) {
        if (dish.sodium_level && dish.sodium_level < 500) {
          score += 15
        }
        if (dietaryFlags.includes('low_sodium')) {
          score += 20
        }
      }

      // Check Soft Texture requirement
      if (activeTags.includes('SoftTexture')) {
        if (dish.texture !== DishTexture.Regular) {
          score += 15
        }
      }

      // Check Gluten Free requirement
      if (activeTags.includes('GlutenFree')) {
        if (dietaryFlags.includes('gluten_free')) {
          score += 20
        } else {
          score -= 50 // Penalty for non-gluten-free
        }
      }

      // Check Lactose Free requirement
      if (activeTags.includes('LactoseFree')) {
        if (dietaryFlags.includes('lactose_free')) {
          score += 20
        } else {
          score -= 50 // Penalty for non-lactose-free
        }
      }

      // Base score for all dishes
      score += 5

      return { dish, score }
    })

    // Sort by score and return top suggestions
    return scoredDishes
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => item.dish)
  }

  // ========== DISH SUGGESTIONS BY TAGS ==========
  async getDishSuggestionsByTags(params: GetDishSuggestionsByTagsParams) {
    const { institution_id, diet_tags = [], exclude_allergens = [] } = params

    // Get all dishes
    const allDishes = await this.getDishes(institution_id)

    // Filter by allergens if provided
    let filteredDishes = allDishes
    if (exclude_allergens.length > 0) {
      filteredDishes = allDishes.filter((dish) => {
        const dietaryFlags = (dish.dietary_flags as string[]) || []
        return !exclude_allergens.some((allergen) =>
          dietaryFlags.some((flag) => flag.toLowerCase().includes(allergen.toLowerCase()))
        )
      })
    }

    // Score dishes based on diet tags
    const scoredDishes = filteredDishes.map((dish) => {
      let score = 0
      const reasons: string[] = []
      const dietaryFlags = (dish.dietary_flags as string[]) || []

      // Check each diet tag requirement
      if (diet_tags.includes('LowSugar')) {
        if (dish.sugar_adjustable) {
          score += 10
          reasons.push('Sugar adjustable')
        }
        if (dietaryFlags.includes('diabetic') || dietaryFlags.includes('low_sugar')) {
          score += 20
          reasons.push('Diabetic-friendly')
        }
      }

      if (diet_tags.includes('LowSodium')) {
        if (dish.sodium_level && dish.sodium_level < 500) {
          score += 15
          reasons.push('Low sodium')
        }
        if (dietaryFlags.includes('low_sodium')) {
          score += 20
          reasons.push('Low sodium certified')
        }
      }

      if (diet_tags.includes('SoftTexture')) {
        if (dish.texture !== DishTexture.Regular) {
          score += 15
          reasons.push('Soft texture')
        }
        if (dish.is_blendable) {
          score += 10
          reasons.push('Blendable')
        }
      }

      if (diet_tags.includes('GlutenFree')) {
        if (dietaryFlags.includes('gluten_free')) {
          score += 20
          reasons.push('Gluten-free')
        } else {
          score -= 50
        }
      }

      if (diet_tags.includes('LactoseFree')) {
        if (dietaryFlags.includes('lactose_free')) {
          score += 20
          reasons.push('Lactose-free')
        } else {
          score -= 50
        }
      }

      // Base score
      score += 5

      return { dish, score, reasons }
    })

    // Sort by score and return top suggestions with reasons
    return scoredDishes
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => ({
        dish: item.dish,
        reasons: item.reasons,
        score: item.score
      }))
  }

  // ========== ALLERGY WARNINGS & SPECIAL PORTIONS ==========
  async getDishAllergyWarnings(dish_id: string, institution_id: string, meal_slot: MealSlot, date?: Date) {
    const dish = await this.getDishById(dish_id, institution_id)
    if (!dish) {
      throw new Error('Dish not found')
    }

    // Get all residents
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

    const affectedResidents: Array<{
      resident_id: string
      resident_name: string
      allergen_substance: string
    }> = []

    const dietaryFlags = (dish.dietary_flags as string[]) || []

    // Check allergies
    for (const resident of residents) {
      for (const allergy of resident.allergies || []) {
        const substance = allergy.substance.toLowerCase()
        if (dietaryFlags.some((flag) => flag.toLowerCase().includes(substance))) {
          affectedResidents.push({
            resident_id: resident.resident_id,
            resident_name: resident.full_name,
            allergen_substance: allergy.substance
          })
          break // Only count once per resident
        }
      }
    }

    // Calculate special portions
    const specialPortions = {
      allergy_safe: 0,
      low_sugar: 0,
      low_sodium: 0,
      soft_texture: 0,
      pureed: 0
    }

    for (const resident of residents) {
      // Skip if has allergy
      const hasAllergy = affectedResidents.some((ar) => ar.resident_id === resident.resident_id)
      if (hasAllergy) {
        specialPortions.allergy_safe++
        continue
      }

      // Check diet tags
      const activeTags = resident.dietTags || []
      const needsLowSugar = activeTags.some((t) => t.tag_type === 'LowSugar')
      const needsLowSodium = activeTags.some((t) => t.tag_type === 'LowSodium')
      const needsSoftTexture = activeTags.some((t) => t.tag_type === 'SoftTexture')

      if (needsLowSugar && !dish.sugar_adjustable && !dietaryFlags.includes('diabetic')) {
        specialPortions.low_sugar++
      }

      if (needsLowSodium && dish.sodium_level && dish.sodium_level > 500) {
        specialPortions.low_sodium++
      }

      if (needsSoftTexture) {
        if (dish.texture === 'Regular') {
          specialPortions.soft_texture++
        } else if (dish.texture === 'Pureed') {
          specialPortions.pureed++
        }
      }
    }

    // Get suggested alternatives (dishes without allergens)
    const allDishes = await this.getDishes(institution_id)
    const suggestedAlternatives = allDishes
      .filter((d) => {
        if (d.dish_id === dish_id) return false
        const dFlags = (d.dietary_flags as string[]) || []
        // Check if this dish has any of the allergens
        const hasAllergen = affectedResidents.some((ar) =>
          dFlags.some((flag) => flag.toLowerCase().includes(ar.allergen_substance.toLowerCase()))
        )
        return !hasAllergen
      })
      .slice(0, 5)
      .map((d) => ({
        dish_id: d.dish_id,
        dish_name: d.name,
        reason: 'Allergy-safe alternative'
      }))

    return {
      dish_id: dish.dish_id,
      dish_name: dish.name,
      affected_residents: affectedResidents,
      total_affected: affectedResidents.length,
      suggested_alternatives: suggestedAlternatives,
      special_portions_needed: specialPortions
    }
  }

  // ========== AUTO-VARIANT METHODS ==========
  async generateDishVariant(dish_id: string, target_texture: DishTexture, institution_id: string) {
    return autoVariantEngine.generateVariant(dish_id, target_texture, institution_id)
  }

  async checkResidentGroupVariants(dish_id: string, resident_ids: string[], institution_id: string) {
    return autoVariantEngine.checkResidentGroupVariants(dish_id, resident_ids, institution_id)
  }

  // ========== NUTRITION VALIDATION ==========
  async validateMenuNutrition(menu_id: string) {
    return nutritionValidatorService.generateWeeklyNutritionReport(menu_id)
  }

  async calculateDishNutrition(dish_id: string, servings: number = 1) {
    return nutritionValidatorService.calculateDishNutrition(dish_id, servings)
  }

  // ========== ALLERGEN TAGS ==========
  async getAllergenTags(institution_id: string): Promise<string[]> {
    // Lấy distinct allergen từ resident allergies (lọc theo institution)
    const allergySubstances = await prisma.allergy.findMany({
      where: {
        resident: {
          institution_id
        }
      },
      select: {
        substance: true
      },
      distinct: ['substance']
    })

    // Lấy distinct dietary_flags từ các dish hiện có
    const dishes = await prisma.dish.findMany({
      where: { institution_id },
      select: {
        dietary_flags: true
      }
    })

    const tagSet = new Set<string>()

    allergySubstances.forEach((a) => {
      if (a.substance) {
        tagSet.add(a.substance)
      }
    })

    dishes.forEach((d) => {
      const flags = (d.dietary_flags as string[]) || []
      flags.forEach((f) => {
        if (f) tagSet.add(f)
      })
    })

    return Array.from(tagSet).sort((a, b) => a.localeCompare(b))
  }
}

export const menuPlannerService = new MenuPlannerService()
export { MenuPlannerService }
