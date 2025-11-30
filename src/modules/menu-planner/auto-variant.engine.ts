import { prisma } from '~/utils/db'
import { DishTexture, MealSlot } from '@prisma/client'
import { AutoVariantResult, ResidentGroupVariantCheck } from './menu-planner.dto'

/**
 * Auto-Variant Engine
 * Rules:
 * - Regular → Minced if blendable
 * - Minced → Pureed if blendable
 * - Pureed → cannot change
 */
export class AutoVariantEngine {
  /**
   * Generate variant texture for a dish
   */
  async generateVariant(
    dish_id: string,
    target_texture: DishTexture,
    institution_id: string
  ): Promise<AutoVariantResult> {
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
      return {
        success: false,
        original_texture: DishTexture.Regular,
        target_texture,
        error: 'Dish not found'
      }
    }

    // Pureed cannot be changed
    if (dish.texture === DishTexture.Pureed) {
      return {
        success: false,
        original_texture: dish.texture,
        target_texture,
        error: 'Pureed dishes cannot be converted to other textures'
      }
    }

    // Check if variant is needed
    if (dish.texture === target_texture) {
      return {
        success: true,
        original_texture: dish.texture,
        target_texture,
        variant_dish_id: dish_id
      }
    }

    // Check if dish is blendable
    if (!dish.is_blendable) {
      return {
        success: false,
        original_texture: dish.texture,
        target_texture,
        error: `Dish "${dish.name}" is not blendable and cannot be converted from ${dish.texture} to ${target_texture}`
      }
    }

    // Validate texture progression
    if (dish.texture === DishTexture.Regular && target_texture === DishTexture.Pureed) {
      // Regular → Pureed: must go through Minced first
      return {
        success: false,
        original_texture: dish.texture,
        target_texture,
        error: 'Cannot convert Regular directly to Pureed. Must convert to Minced first.'
      }
    }

    if (dish.texture === DishTexture.Minced && target_texture === DishTexture.Regular) {
      return {
        success: false,
        original_texture: dish.texture,
        target_texture,
        error: 'Cannot convert Minced back to Regular'
      }
    }

    // Check if variant already exists
    const existingVariant = await prisma.dish.findFirst({
      where: {
        institution_id,
        name: `${dish.name} (${target_texture})`,
        texture: target_texture
      }
    })

    if (existingVariant) {
      return {
        success: true,
        original_texture: dish.texture,
        target_texture,
        variant_dish_id: existingVariant.dish_id
      }
    }

    // Create variant dish
    const variantDish = await prisma.dish.create({
      data: {
        institution_id: dish.institution_id,
        name: `${dish.name} (${target_texture})`,
        calories_per_100g: dish.calories_per_100g,
        texture: target_texture,
        sugar_adjustable: dish.sugar_adjustable,
        sodium_level: dish.sodium_level,
        dietary_flags: dish.dietary_flags as any,
        is_blendable: false, // Variants are not further blendable
        dishIngredients: {
          create: dish.dishIngredients.map((di) => ({
            ingredient_id: di.ingredient_id,
            amount: di.amount
          }))
        }
      }
    })

    return {
      success: true,
      original_texture: dish.texture,
      target_texture,
      variant_dish_id: variantDish.dish_id
    }
  }

  /**
   * Check variant requirements for a resident group
   */
  async checkResidentGroupVariants(
    dish_id: string,
    resident_ids: string[],
    institution_id: string
  ): Promise<ResidentGroupVariantCheck[]> {
    const residents = await prisma.resident.findMany({
      where: {
        resident_id: { in: resident_ids },
        institution_id
      },
      include: {
        chronicDiseases: {
          where: {
            status: 'ACTIVE'
          }
        }
      }
    })

    const dish = await prisma.dish.findUnique({
      where: { dish_id }
    })

    if (!dish) {
      throw new Error('Dish not found')
    }

    const results: ResidentGroupVariantCheck[] = []

    for (const resident of residents) {
      // Determine required texture based on conditions
      let required_texture: DishTexture = DishTexture.Regular

      // Check for dysphagia (difficulty swallowing)
      const hasDysphagia = (resident.chronicDiseases || []).some(
        (d: { name: string }) => d.name.toLowerCase().includes('dysphagia') || d.name.toLowerCase().includes('khó nuốt')
      )

      if (hasDysphagia) {
        // Severe dysphagia → Pureed, Moderate → Minced
        const dysphagiaDisease = (resident.chronicDiseases || []).find(
          (d) => d.name.toLowerCase().includes('dysphagia') || d.name.toLowerCase().includes('khó nuốt')
        )
        if (dysphagiaDisease?.severity === 'SEVERE') {
          required_texture = DishTexture.Pureed
        } else {
          required_texture = DishTexture.Minced
        }
      }

      // Generate variant if needed
      const variantResult = await this.generateVariant(dish_id, required_texture, institution_id)

      results.push({
        resident_id: resident.resident_id,
        resident_name: resident.full_name,
        required_texture,
        variant_result: variantResult
      })
    }

    return results
  }

  /**
   * Get all variants for a dish
   */
  async getDishVariants(dish_id: string, institution_id: string): Promise<string[]> {
    const dish = await prisma.dish.findUnique({
      where: { dish_id }
    })

    if (!dish) {
      return []
    }

    // Extract base name (remove texture suffix if exists)
    const baseName = dish.name.replace(/\s*\(Regular\)|\s*\(Minced\)|\s*\(Pureed\)/gi, '').trim()

    const variants = await prisma.dish.findMany({
      where: {
        institution_id,
        name: {
          startsWith: baseName
        }
      },
      select: {
        dish_id: true
      }
    })

    return variants.map((v) => v.dish_id)
  }

  /**
   * Generate production instructions for a meal slot
   * Returns instructions grouped by diet tag/texture
   */
  async generateProductionInstructions(
    menu_id: string,
    day_of_week: number,
    meal_slot: MealSlot,
    institution_id: string
  ): Promise<
    Array<{
      dish_name: string
      texture: string
      servings: number
      instruction: string
      diet_tags: string[]
    }>
  > {
    const menu = await prisma.weeklyMenu.findUnique({
      where: { menu_id },
      include: {
        menuItems: {
          where: {
            day_of_week,
            meal_slot
          },
          include: {
            dish: true
          }
        }
      }
    })

    if (!menu) {
      throw new Error('Menu not found')
    }

    const instructions: Array<{
      dish_name: string
      texture: string
      servings: number
      instruction: string
      diet_tags: string[]
    }> = []

    // Get all residents with their diet tags
    const residents = await prisma.resident.findMany({
      where: {
        institution_id
      },
      include: {
        dietTags: {
          where: {
            is_active: true
          }
        },
        allergies: true
      }
    })

    // For each menu item, calculate servings by texture and diet tag
    for (const menuItem of menu.menuItems) {
      const dish = menuItem.dish

      // Group residents by texture requirement
      const textureGroups: Record<
        string,
        {
          count: number
          dietTags: Set<string>
        }
      > = {
        Regular: { count: 0, dietTags: new Set() },
        Minced: { count: 0, dietTags: new Set() },
        Pureed: { count: 0, dietTags: new Set() }
      }

      for (const resident of residents) {
        // Check allergies
        const allergies = (resident as any).allergies || []
        const hasAllergy = allergies.some((allergy: any) => {
          const substance = allergy.substance.toLowerCase()
          const dietaryFlags = (dish.dietary_flags as string[]) || []
          return dietaryFlags.some((flag) => flag.toLowerCase().includes(substance))
        })

        if (hasAllergy) {
          continue // Skip this resident
        }

        // Determine texture requirement
        const dietTags = (resident as any).dietTags || []
        const hasSoftTexture = dietTags.some((t: any) => t.tag_type === 'SoftTexture')

        let requiredTexture = dish.texture
        if (hasSoftTexture) {
          if (dish.texture === 'Regular') {
            requiredTexture = 'Minced' // Default to Minced for soft texture
          } else {
            requiredTexture = dish.texture
          }
        }

        // Count servings
        textureGroups[requiredTexture].count++

        // Collect diet tags
        for (const tag of dietTags) {
          textureGroups[requiredTexture].dietTags.add(tag.tag_name)
        }
      }

      // Generate instructions for each texture variant
      for (const [texture, group] of Object.entries(textureGroups)) {
        if (group.count === 0) continue

        let instruction = ''
        if (texture === 'Regular') {
          instruction = `${group.count} x ${dish.name}`
        } else if (texture === 'Minced') {
          instruction = `${group.count} x ${dish.name}, Minced for Soft Texture`
        } else if (texture === 'Pureed') {
          instruction = `${group.count} x ${dish.name}, Pureed for Soft Texture`
        }

        instructions.push({
          dish_name: dish.name,
          texture,
          servings: group.count,
          instruction,
          diet_tags: Array.from(group.dietTags)
        })
      }
    }

    return instructions
  }
}

export const autoVariantEngine = new AutoVariantEngine()
