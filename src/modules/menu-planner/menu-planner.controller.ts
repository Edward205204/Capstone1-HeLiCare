import { HTTP_STATUS } from '~/constants/http_status'
import { MenuPlannerService, menuPlannerService as menuPlannerServiceInstance } from './menu-planner.service'
import { Request, Response } from 'express'
import { DishTexture, MealSlot, FamilyLinkStatus } from '@prisma/client'
import { menuExportService } from './menu-export.service'
import { prisma } from '~/utils/db'
import { servingsCalculationService } from './servings-calculation.service'

class MenuPlannerController {
  constructor(private readonly menuPlannerService: MenuPlannerService = menuPlannerServiceInstance) {}

  // ========== DISH ENDPOINTS ==========
  createDish = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.menuPlannerService.createDish({
      institution_id,
      ...req.body
    })
    res.status(HTTP_STATUS.CREATED).json({ message: 'Dish created successfully', data })
  }

  updateDish = async (req: Request, res: Response) => {
    const { dish_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.menuPlannerService.updateDish({
      dish_id,
      institution_id,
      ...req.body
    })
    res.status(HTTP_STATUS.OK).json({ message: 'Dish updated successfully', data })
  }

  getDishes = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const texture = req.query.texture as DishTexture | undefined
    const data = await this.menuPlannerService.getDishes(institution_id, texture)
    res.status(HTTP_STATUS.OK).json({ message: 'Dishes fetched successfully', data })
  }

  getDishById = async (req: Request, res: Response) => {
    const { dish_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.menuPlannerService.getDishById(dish_id, institution_id)
    if (!data) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Dish not found' })
    }
    res.status(HTTP_STATUS.OK).json({ message: 'Dish fetched successfully', data })
  }

  deleteDish = async (req: Request, res: Response) => {
    const { dish_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    await this.menuPlannerService.deleteDish(dish_id, institution_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Dish deleted successfully' })
  }

  // ========== INGREDIENT ENDPOINTS ==========
  createIngredient = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.menuPlannerService.createIngredient({
      institution_id,
      ...req.body
    })
    res.status(HTTP_STATUS.CREATED).json({ message: 'Ingredient created successfully', data })
  }

  updateIngredient = async (req: Request, res: Response) => {
    const { ingredient_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.menuPlannerService.updateIngredient({
      ingredient_id,
      institution_id,
      ...req.body
    })
    res.status(HTTP_STATUS.OK).json({ message: 'Ingredient updated successfully', data })
  }

  getIngredients = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.menuPlannerService.getIngredients(institution_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Ingredients fetched successfully', data })
  }

  getIngredientById = async (req: Request, res: Response) => {
    const { ingredient_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.menuPlannerService.getIngredientById(ingredient_id, institution_id)
    if (!data) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Ingredient not found' })
    }
    res.status(HTTP_STATUS.OK).json({ message: 'Ingredient fetched successfully', data })
  }

  deleteIngredient = async (req: Request, res: Response) => {
    const { ingredient_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    await this.menuPlannerService.deleteIngredient(ingredient_id, institution_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Ingredient deleted successfully' })
  }

  // ========== WEEKLY MENU ENDPOINTS ==========
  createWeeklyMenu = async (req: Request, res: Response) => {
    try {
      const institution_id = req.decoded_authorization?.institution_id as string
      const created_by_id = req.decoded_authorization?.user_id as string
      const { week_start_date, menuItems } = req.body

      const result = await this.menuPlannerService.createWeeklyMenu({
        institution_id,
        week_start_date: new Date(week_start_date),
        created_by_id,
        menuItems
      })

      res.status(HTTP_STATUS.CREATED).json({
        message: result.wasUpdate ? 'Weekly menu updated successfully' : 'Weekly menu created successfully',
        data: result.menu,
        nutrition_report: result.nutrition_report,
        wasUpdate: result.wasUpdate
      })
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Failed to create weekly menu',
        errorInfo: { message: error.message }
      })
    }
  }

  copyWeekMenu = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const created_by_id = req.decoded_authorization?.user_id as string
    const { source_week_start_date, target_week_start_date, adjust_servings } = req.body

    const data = await this.menuPlannerService.copyWeekMenu({
      institution_id,
      source_week_start_date: new Date(source_week_start_date),
      target_week_start_date: new Date(target_week_start_date),
      created_by_id,
      adjust_servings: adjust_servings ?? true
    })

    res.status(HTTP_STATUS.CREATED).json({ message: 'Week menu copied successfully', data })
  }

  getWeeklyMenu = async (req: Request, res: Response) => {
    const { menu_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const data = await this.menuPlannerService.getWeeklyMenu(menu_id, institution_id)
    if (!data) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Menu not found' })
      return
    }
    res.status(HTTP_STATUS.OK).json({ message: 'Weekly menu fetched successfully', data })
  }

  getWeeklyMenuByWeek = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { week_start_date } = req.params

    if (!week_start_date) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'week_start_date is required' })
      return
    }

    const data = await this.menuPlannerService.getWeeklyMenuByWeek(institution_id, new Date(week_start_date as string))

    if (!data) {
      // Return 200 with null data instead of 404 - this is expected when no menu exists
      res.status(HTTP_STATUS.OK).json({
        message: 'No menu found for this week',
        data: null
      })
      return
    }

    res.status(HTTP_STATUS.OK).json({ message: 'Weekly menu fetched successfully', data })
  }

  // Get weekly menu by week for family user (gets institution_id from resident links)
  getWeeklyMenuByWeekForFamily = async (req: Request, res: Response) => {
    console.log('=== getWeeklyMenuByWeekForFamily DEBUG ===')
    console.log('Request URL:', req.url)
    console.log('Request method:', req.method)
    console.log('Request params:', req.params)
    console.log('Request query:', req.query)
    console.log('Decoded auth:', req.decoded_authorization)

    const user_id = req.decoded_authorization?.user_id as string
    const { week_start_date } = req.params

    console.log('user_id:', user_id)
    console.log('week_start_date from params:', week_start_date)

    if (!week_start_date) {
      console.log('ERROR: week_start_date is missing')
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'week_start_date is required' })
      return
    }

    if (!user_id) {
      console.log('ERROR: user_id is missing')
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'User ID not found in token' })
      return
    }

    console.log('Looking for family link for user_id:', user_id)
    // Get institution_id from family resident links
    const familyLink = await prisma.familyResidentLink.findFirst({
      where: {
        family_user_id: user_id,
        status: FamilyLinkStatus.active
      },
      include: {
        resident: {
          select: {
            institution_id: true
          }
        }
      }
    })

    console.log('Family link found:', familyLink ? 'YES' : 'NO')

    if (!familyLink || !familyLink.resident.institution_id) {
      console.log('ERROR: No active resident link or no institution_id')
      console.log('familyLink:', familyLink)
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'No active resident link found or resident has no institution'
      })
      return
    }

    const institution_id = familyLink.resident.institution_id
    console.log('Institution ID:', institution_id)
    console.log('Looking for menu for week:', week_start_date)

    // Parse date string to Date object, ensuring it's at midnight UTC
    const dateStr = week_start_date as string
    console.log('Date string:', dateStr)
    const parsedDate = new Date(dateStr + 'T00:00:00.000Z')
    console.log('Parsed date:', parsedDate)
    console.log('Parsed date ISO:', parsedDate.toISOString())

    const data = await this.menuPlannerService.getWeeklyMenuByWeek(institution_id, parsedDate)

    console.log('Menu data found:', data ? 'YES' : 'NO')

    if (!data) {
      console.log('INFO: No menu found for this week - returning null')
      console.log('=== END DEBUG ===')
      // Return 200 with null data instead of 404 - this is expected when no menu exists
      res.status(HTTP_STATUS.OK).json({
        message: 'No menu found for this week',
        data: null
      })
      return
    }

    res.status(HTTP_STATUS.OK).json({ message: 'Weekly menu fetched successfully', data })
    return
  }

  getWeeklyMenus = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const take = Number(req.query.take) || 10
    const skip = Number(req.query.skip) || 0

    const result = await this.menuPlannerService.getWeeklyMenus(institution_id, take, skip)
    res.status(HTTP_STATUS.OK).json({
      message: 'Weekly menus fetched successfully',
      data: result.data,
      total: result.total
    })
  }

  deleteWeeklyMenu = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { menu_id } = req.params

    await this.menuPlannerService.deleteWeeklyMenu(menu_id, institution_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Weekly menu deleted successfully' })
  }

  // ========== DISH SUGGESTIONS ==========
  getDishSuggestions = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { resident_id } = req.params
    const meal_slot = req.query.meal_slot as MealSlot | undefined
    const day_of_week = req.query.day_of_week ? Number(req.query.day_of_week) : undefined

    const data = await this.menuPlannerService.getDishSuggestions({
      institution_id,
      resident_id,
      meal_slot,
      day_of_week
    })

    res.status(HTTP_STATUS.OK).json({ message: 'Dish suggestions fetched successfully', data })
  }

  getDishSuggestionsByTags = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const diet_tags = req.query.diet_tags ? (req.query.diet_tags as string).split(',').filter(Boolean) : []
    const meal_slot = req.query.meal_slot as MealSlot | undefined
    const exclude_allergens = req.query.exclude_allergens
      ? (req.query.exclude_allergens as string).split(',').filter(Boolean)
      : []

    const data = await this.menuPlannerService.getDishSuggestionsByTags({
      institution_id,
      diet_tags,
      meal_slot,
      exclude_allergens
    })

    res.status(HTTP_STATUS.OK).json({ message: 'Dish suggestions fetched successfully', data })
  }

  getDishAllergyWarnings = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { dish_id } = req.params
    const meal_slot = req.query.meal_slot as MealSlot
    const date = req.query.date ? new Date(req.query.date as string) : undefined

    const data = await this.menuPlannerService.getDishAllergyWarnings(dish_id, institution_id, meal_slot, date)

    res.status(HTTP_STATUS.OK).json({ message: 'Allergy warnings fetched successfully', data })
  }

  // ========== AUTO-VARIANT ==========
  generateDishVariant = async (req: Request, res: Response) => {
    const { dish_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const { target_texture } = req.body

    const data = await this.menuPlannerService.generateDishVariant(
      dish_id,
      target_texture as DishTexture,
      institution_id
    )

    res.status(HTTP_STATUS.OK).json({ message: 'Variant generation completed', data })
  }

  checkResidentGroupVariants = async (req: Request, res: Response) => {
    const { dish_id } = req.params
    const institution_id = req.decoded_authorization?.institution_id as string
    const { resident_ids } = req.body

    const data = await this.menuPlannerService.checkResidentGroupVariants(dish_id, resident_ids, institution_id)

    res.status(HTTP_STATUS.OK).json({ message: 'Variant check completed', data })
  }

  // ========== NUTRITION VALIDATION ==========
  validateMenuNutrition = async (req: Request, res: Response) => {
    const { menu_id } = req.params
    const data = await this.menuPlannerService.validateMenuNutrition(menu_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Nutrition validation completed', data })
  }

  // Validate menu nutrition for family user (gets menu_id from weekly menu)
  validateMenuNutritionForFamily = async (req: Request, res: Response) => {
    const user_id = req.decoded_authorization?.user_id as string
    const { week_start_date } = req.params

    if (!week_start_date) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'week_start_date is required' })
      return
    }

    if (!user_id) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'User ID not found in token' })
      return
    }

    // Get institution_id from family resident links
    const familyLink = await prisma.familyResidentLink.findFirst({
      where: {
        family_user_id: user_id,
        status: FamilyLinkStatus.active
      },
      include: {
        resident: {
          select: {
            institution_id: true
          }
        }
      }
    })

    if (!familyLink || !familyLink.resident.institution_id) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'No active resident link found or resident has no institution'
      })
      return
    }

    const institution_id = familyLink.resident.institution_id
    const parsedDate = new Date(week_start_date + 'T00:00:00.000Z')

    // Get menu for this week
    const menu = await this.menuPlannerService.getWeeklyMenuByWeek(institution_id, parsedDate)
    if (!menu) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'No menu found for this week'
      })
      return
    }

    // Validate nutrition
    const data = await this.menuPlannerService.validateMenuNutrition(menu.menu_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Nutrition validation completed', data })
  }

  calculateDishNutrition = async (req: Request, res: Response) => {
    const { dish_id } = req.params
    const servings = Number(req.query.servings) || 1
    const data = await this.menuPlannerService.calculateDishNutrition(dish_id, servings)
    res.status(HTTP_STATUS.OK).json({ message: 'Nutrition calculated successfully', data })
  }

  // ========== SERVINGS CALCULATION ==========
  getServingsSummary = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const date = req.query.date ? new Date(req.query.date as string) : undefined

    const data = await servingsCalculationService.getServingsSummary(institution_id, date)
    res.status(HTTP_STATUS.OK).json({ message: 'Servings summary fetched successfully', data })
  }

  calculateServingsForDish = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { dish_id } = req.params
    const meal_slot = req.query.meal_slot as MealSlot
    const date = req.query.date ? new Date(req.query.date as string) : undefined

    const data = await servingsCalculationService.calculateServingsForDish(institution_id, dish_id, meal_slot, date)
    res.status(HTTP_STATUS.OK).json({ message: 'Servings calculated successfully', data })
  }

  calculateDetailedServingsBreakdown = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { dish_id } = req.params
    const meal_slot = req.query.meal_slot as MealSlot
    const date = req.query.date ? new Date(req.query.date as string) : undefined

    const data = await servingsCalculationService.calculateDetailedServingsBreakdown(
      institution_id,
      dish_id,
      meal_slot,
      date
    )
    res.status(HTTP_STATUS.OK).json({ message: 'Detailed servings breakdown calculated successfully', data })
  }

  getMenuServingsBreakdown = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string
    const { menu_id } = req.params

    const data = await servingsCalculationService.calculateMenuServingsBreakdown(menu_id, institution_id)
    res.status(HTTP_STATUS.OK).json({ message: 'Menu servings breakdown calculated successfully', data })
  }

  // ========== MENU EXPORT ==========
  exportMenuAsPDF = async (req: Request, res: Response) => {
    const { menu_id } = req.params
    await menuExportService.exportMenuAsPDF(menu_id, res)
  }

  exportMenuAsExcel = async (req: Request, res: Response) => {
    const { menu_id } = req.params
    await menuExportService.exportMenuAsExcel(menu_id, res)
  }

  // ========== ALLERGEN TAGS ==========
  getAllergenTags = async (req: Request, res: Response) => {
    const institution_id = req.decoded_authorization?.institution_id as string

    const tags = await this.menuPlannerService.getAllergenTags(institution_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Allergen tags fetched successfully',
      data: tags
    })
  }
}

export const menuPlannerController = new MenuPlannerController()
