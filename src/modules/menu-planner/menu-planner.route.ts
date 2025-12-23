import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'
import { isHandleByStaffValidator, isHandleByStaffOrFamilyValidator } from '~/common/common.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { menuPlannerController } from './menu-planner.controller'
import {
  createDishSchema,
  updateDishSchema,
  getDishByIdSchema,
  deleteDishSchema,
  createIngredientSchema,
  updateIngredientSchema,
  getIngredientByIdSchema,
  deleteIngredientSchema,
  createWeeklyMenuSchema,
  copyWeekMenuSchema,
  getWeeklyMenuSchema,
  getWeeklyMenuByWeekSchema,
  getWeeklyMenusSchema,
  deleteWeeklyMenuSchema,
  getDishSuggestionsSchema,
  generateDishVariantSchema,
  checkResidentGroupVariantsSchema,
  validateMenuNutritionSchema,
  calculateDishNutritionSchema
} from './menu-planner.schema'
import { validateRequest } from './menu-planner.middleware'

const menuPlannerRouter = Router()

// ========== DISH ROUTES ==========
menuPlannerRouter.post(
  '/dishes',
  accessTokenValidator,
  isHandleByStaffValidator,
  createDishSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.createDish)
)

menuPlannerRouter.put(
  '/dishes/:dish_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  updateDishSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.updateDish)
)

menuPlannerRouter.get(
  '/dishes',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(menuPlannerController.getDishes)
)

menuPlannerRouter.get(
  '/dishes/:dish_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  getDishByIdSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.getDishById)
)

menuPlannerRouter.delete(
  '/dishes/:dish_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  deleteDishSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.deleteDish)
)

// ========== INGREDIENT ROUTES ==========
menuPlannerRouter.post(
  '/ingredients',
  accessTokenValidator,
  isHandleByStaffValidator,
  createIngredientSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.createIngredient)
)

menuPlannerRouter.put(
  '/ingredients/:ingredient_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  updateIngredientSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.updateIngredient)
)

menuPlannerRouter.get(
  '/ingredients',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(menuPlannerController.getIngredients)
)

menuPlannerRouter.get(
  '/ingredients/:ingredient_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  getIngredientByIdSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.getIngredientById)
)

menuPlannerRouter.delete(
  '/ingredients/:ingredient_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  deleteIngredientSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.deleteIngredient)
)

// ========== WEEKLY MENU ROUTES ==========
menuPlannerRouter.post(
  '/weekly-menus',
  accessTokenValidator,
  isHandleByStaffValidator,
  createWeeklyMenuSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.createWeeklyMenu)
)

menuPlannerRouter.post(
  '/weekly-menus/copy',
  accessTokenValidator,
  isHandleByStaffValidator,
  copyWeekMenuSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.copyWeekMenu)
)

menuPlannerRouter.get(
  '/weekly-menus',
  accessTokenValidator,
  isHandleByStaffValidator,
  getWeeklyMenusSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.getWeeklyMenus)
)

menuPlannerRouter.get(
  '/weekly-menus/:menu_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  getWeeklyMenuSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.getWeeklyMenu)
)

menuPlannerRouter.delete(
  '/weekly-menus/:menu_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  deleteWeeklyMenuSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.deleteWeeklyMenu)
)

// Get weekly menu by week for family user (no staff validator required)
// MUST be before /weekly-menus/week/:week_start_date to avoid route conflict
menuPlannerRouter.get(
  '/weekly-menus/week/:week_start_date/family',
  accessTokenValidator,
  getWeeklyMenuByWeekSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.getWeeklyMenuByWeekForFamily)
)

menuPlannerRouter.get(
  '/weekly-menus/week/:week_start_date',
  accessTokenValidator,
  isHandleByStaffValidator,
  getWeeklyMenuByWeekSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.getWeeklyMenuByWeek)
)

//  DISH SUGGESTIONS
menuPlannerRouter.get(
  '/dish-suggestions/:resident_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  getDishSuggestionsSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.getDishSuggestions)
)

menuPlannerRouter.get(
  '/dish-suggestions',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(menuPlannerController.getDishSuggestionsByTags)
)

menuPlannerRouter.get(
  '/dishes/:dish_id/allergy-warnings',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(menuPlannerController.getDishAllergyWarnings)
)

// ========== AUTO-VARIANT ==========
menuPlannerRouter.post(
  '/dishes/:dish_id/variant',
  accessTokenValidator,
  isHandleByStaffValidator,
  generateDishVariantSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.generateDishVariant)
)

menuPlannerRouter.post(
  '/dishes/:dish_id/check-variants',
  accessTokenValidator,
  isHandleByStaffValidator,
  checkResidentGroupVariantsSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.checkResidentGroupVariants)
)

// ========== NUTRITION VALIDATION ==========
menuPlannerRouter.get(
  '/weekly-menus/:menu_id/nutrition',
  accessTokenValidator,
  isHandleByStaffValidator,
  validateMenuNutritionSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.validateMenuNutrition)
)

// Nutrition validation for family user (by week_start_date)
menuPlannerRouter.get(
  '/weekly-menus/week/:week_start_date/nutrition/family',
  accessTokenValidator,
  getWeeklyMenuByWeekSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.validateMenuNutritionForFamily)
)

menuPlannerRouter.get(
  '/dishes/:dish_id/nutrition',
  accessTokenValidator,
  isHandleByStaffOrFamilyValidator,
  calculateDishNutritionSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.calculateDishNutrition)
)

// ========== SERVINGS CALCULATION ==========
menuPlannerRouter.get(
  '/servings/summary',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(menuPlannerController.getServingsSummary)
)

menuPlannerRouter.get(
  '/servings/dish/:dish_id',
  accessTokenValidator,
  isHandleByStaffValidator,
  calculateDishNutritionSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.calculateServingsForDish)
)

menuPlannerRouter.get(
  '/servings/dish/:dish_id/detailed',
  accessTokenValidator,
  isHandleByStaffValidator,
  calculateDishNutritionSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.calculateDetailedServingsBreakdown)
)

menuPlannerRouter.get(
  '/weekly-menus/:menu_id/servings-breakdown',
  accessTokenValidator,
  isHandleByStaffValidator,
  validateMenuNutritionSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.getMenuServingsBreakdown)
)

// ========== ALLERGEN TAGS ==========
menuPlannerRouter.get(
  '/allergens',
  accessTokenValidator,
  isHandleByStaffValidator,
  wrapRequestHandler(menuPlannerController.getAllergenTags)
)

// ========== MENU EXPORT ==========
menuPlannerRouter.get(
  '/weekly-menus/:menu_id/export/pdf',
  accessTokenValidator,
  isHandleByStaffValidator,
  validateMenuNutritionSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.exportMenuAsPDF)
)

menuPlannerRouter.get(
  '/weekly-menus/:menu_id/export/excel',
  accessTokenValidator,
  isHandleByStaffValidator,
  validateMenuNutritionSchema,
  validateRequest,
  wrapRequestHandler(menuPlannerController.exportMenuAsExcel)
)

export default menuPlannerRouter
