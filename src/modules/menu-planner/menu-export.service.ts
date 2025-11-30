import { prisma } from '~/utils/db'
import { MealSlot } from '@prisma/client'
import { Response } from 'express'

// Dynamic imports for optional dependencies
let PDFDocument: any
let ExcelJS: any

async function loadPDFKit(): Promise<any> {
  if (!PDFDocument) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      PDFDocument = require('pdfkit')
    } catch {
      console.warn('pdfkit not installed. PDF export will not work.')
    }
  }
  return PDFDocument
}

async function loadExcelJS(): Promise<any> {
  if (!ExcelJS) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ExcelJS = require('exceljs')
    } catch {
      console.warn('exceljs not installed. Excel export will not work.')
    }
  }
  return ExcelJS
}

interface ShoppingListItem {
  ingredient_id: string
  ingredient_name: string
  unit: string
  total_amount: number
}

interface CookingInstruction {
  dish_id: string
  dish_name: string
  texture: string
  ingredients: Array<{
    name: string
    amount: number
    unit: string
  }>
  instructions: string
}

export class MenuExportService {
  /**
   * Generate Shopping List from Weekly Menu
   */
  async generateShoppingList(menu_id: string): Promise<ShoppingListItem[]> {
    const menu = await prisma.weeklyMenu.findUnique({
      where: { menu_id },
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

    if (!menu) {
      throw new Error('Menu not found')
    }

    // Aggregate ingredients by ingredient_id
    const ingredientMap = new Map<string, ShoppingListItem>()

    for (const menuItem of menu.menuItems) {
      const servings = menuItem.servings
      const dish = menuItem.dish

      for (const dishIngredient of dish.dishIngredients) {
        const ingredient = dishIngredient.ingredient
        const totalAmount = dishIngredient.amount * servings

        if (ingredientMap.has(ingredient.ingredient_id)) {
          const existing = ingredientMap.get(ingredient.ingredient_id)!
          existing.total_amount += totalAmount
        } else {
          ingredientMap.set(ingredient.ingredient_id, {
            ingredient_id: ingredient.ingredient_id,
            ingredient_name: ingredient.name,
            unit: ingredient.unit,
            total_amount: totalAmount
          })
        }
      }
    }

    return Array.from(ingredientMap.values()).sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name))
  }

  /**
   * Generate Cooking Instructions from Weekly Menu
   */
  async generateCookingInstructions(menu_id: string): Promise<CookingInstruction[]> {
    const menu = await prisma.weeklyMenu.findUnique({
      where: { menu_id },
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

    if (!menu) {
      throw new Error('Menu not found')
    }

    // Group by dish_id and texture
    const dishMap = new Map<string, CookingInstruction>()

    for (const menuItem of menu.menuItems) {
      const dish = menuItem.dish
      const texture = menuItem.texture_variant || dish.texture
      const key = `${dish.dish_id}_${texture}`

      if (!dishMap.has(key)) {
        const ingredients = dish.dishIngredients.map((di) => ({
          name: di.ingredient.name,
          amount: di.amount,
          unit: di.ingredient.unit
        }))

        dishMap.set(key, {
          dish_id: dish.dish_id,
          dish_name: `${dish.name}${texture !== dish.texture ? ` (${texture})` : ''}`,
          texture: texture,
          ingredients,
          instructions: this.generateInstructions(dish.name, texture, ingredients)
        })
      }
    }

    return Array.from(dishMap.values())
  }

  /**
   * Generate cooking instructions based on dish and texture
   */
  private generateInstructions(
    dishName: string,
    texture: string,
    ingredients: Array<{ name: string; amount: number; unit: string }>
  ): string {
    let instructions = `1. Prepare ingredients: ${ingredients.map((i) => `${i.amount}${i.unit} ${i.name}`).join(', ')}\n`

    if (texture === 'Regular') {
      instructions += `2. Cook ${dishName} according to standard recipe\n`
      instructions += `3. Serve at appropriate temperature\n`
    } else if (texture === 'Minced') {
      instructions += `2. Cook ${dishName} until tender\n`
      instructions += `3. Mince or finely chop all ingredients\n`
      instructions += `4. Mix well and serve\n`
    } else if (texture === 'Pureed') {
      instructions += `2. Cook ${dishName} until very tender\n`
      instructions += `3. Blend or puree until smooth consistency\n`
      instructions += `4. Strain if necessary to remove lumps\n`
      instructions += `5. Serve at appropriate temperature\n`
    }

    return instructions
  }

  /**
   * Export Menu as PDF
   */
  async exportMenuAsPDF(menu_id: string, res: Response): Promise<void> {
    const PDFDoc = await loadPDFKit()
    if (!PDFDoc) {
      throw new Error('PDF export is not available. Please install pdfkit: npm install pdfkit')
    }
    const menu = await prisma.weeklyMenu.findUnique({
      where: { menu_id },
      include: {
        menuItems: {
          include: {
            dish: true
          },
          orderBy: [{ day_of_week: 'asc' }, { meal_slot: 'asc' }]
        },
        institution: {
          select: {
            name: true
          }
        }
      }
    })

    if (!menu) {
      throw new Error('Menu not found')
    }

    const shoppingList = await this.generateShoppingList(menu_id)
    const cookingInstructions = await this.generateCookingInstructions(menu_id)

    const doc = new PDFDoc({ margin: 50 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="weekly-menu-${menu.week_start_date.toISOString().split('T')[0]}.pdf"`
    )

    doc.pipe(res)

    // Header
    doc.fontSize(20).text('Weekly Menu Plan', { align: 'center' })
    doc.fontSize(12).text(`${menu.institution.name}`, { align: 'center' })
    doc
      .fontSize(10)
      .text(`Week: ${menu.week_start_date.toDateString()} - ${menu.week_end_date.toDateString()}`, { align: 'center' })
    doc.moveDown(2)

    // Weekly Menu Schedule
    doc.fontSize(16).text('Weekly Menu Schedule', { underline: true })
    doc.moveDown()

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const mealSlots: MealSlot[] = ['Breakfast', 'Lunch', 'Afternoon', 'Dinner']

    for (let day = 0; day < 7; day++) {
      doc.fontSize(14).text(dayNames[day], { underline: true })
      doc.moveDown(0.5)

      for (const slot of mealSlots) {
        const items = menu.menuItems.filter((item) => item.day_of_week === day && item.meal_slot === slot)

        if (items.length > 0) {
          doc.fontSize(12).text(`${slot}:`, { continued: false })
          items.forEach((item) => {
            doc.fontSize(10).text(`  • ${item.dish.name} (${item.servings} servings)`, {
              indent: 20
            })
          })
          doc.moveDown(0.5)
        }
      }
      doc.moveDown()
    }

    // Shopping List
    doc.addPage()
    doc.fontSize(16).text('Shopping List', { underline: true })
    doc.moveDown()

    doc.fontSize(12)
    shoppingList.forEach((item) => {
      doc.text(`${item.ingredient_name}: ${item.total_amount}${item.unit}`, {
        indent: 20
      })
    })

    // Cooking Instructions
    doc.addPage()
    doc.fontSize(16).text('Cooking Instructions', { underline: true })
    doc.moveDown()

    cookingInstructions.forEach((instruction) => {
      doc.fontSize(14).text(instruction.dish_name, { underline: true })
      doc.fontSize(10).text(`Texture: ${instruction.texture}`)
      doc.moveDown(0.5)
      doc.fontSize(10).text(instruction.instructions, { indent: 20 })
      doc.moveDown()
    })

    doc.end()
  }

  /**
   * Export Menu as Excel
   */
  async exportMenuAsExcel(menu_id: string, res: Response): Promise<void> {
    const Excel = await loadExcelJS()
    if (!Excel) {
      throw new Error('Excel export is not available. Please install exceljs: npm install exceljs')
    }
    const menu = await prisma.weeklyMenu.findUnique({
      where: { menu_id },
      include: {
        menuItems: {
          include: {
            dish: true
          },
          orderBy: [{ day_of_week: 'asc' }, { meal_slot: 'asc' }]
        },
        institution: {
          select: {
            name: true
          }
        }
      }
    })

    if (!menu) {
      throw new Error('Menu not found')
    }

    const shoppingList = await this.generateShoppingList(menu_id)
    const cookingInstructions = await this.generateCookingInstructions(menu_id)

    const workbook = new Excel.Workbook()
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const mealSlots: MealSlot[] = ['Breakfast', 'Lunch', 'Afternoon', 'Dinner']

    // Sheet 1: Weekly Menu
    const menuSheet = workbook.addWorksheet('Weekly Menu')
    menuSheet.columns = [
      { header: 'Day', key: 'day', width: 15 },
      { header: 'Meal Slot', key: 'slot', width: 15 },
      { header: 'Dish Name', key: 'dish', width: 30 },
      { header: 'Servings', key: 'servings', width: 10 },
      { header: 'Texture', key: 'texture', width: 15 }
    ]

    for (let day = 0; day < 7; day++) {
      for (const slot of mealSlots) {
        const items = menu.menuItems.filter((item) => item.day_of_week === day && item.meal_slot === slot)

        if (items.length > 0) {
          items.forEach((item) => {
            menuSheet.addRow({
              day: dayNames[day],
              slot: slot,
              dish: item.dish.name,
              servings: item.servings,
              texture: item.texture_variant || item.dish.texture
            })
          })
        }
      }
    }

    // Sheet 2: Shopping List
    const shoppingSheet = workbook.addWorksheet('Shopping List')
    shoppingSheet.columns = [
      { header: 'Ingredient', key: 'ingredient', width: 30 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 }
    ]

    shoppingList.forEach((item) => {
      shoppingSheet.addRow({
        ingredient: item.ingredient_name,
        amount: item.total_amount,
        unit: item.unit
      })
    })

    // Sheet 3: Cooking Instructions
    const instructionsSheet = workbook.addWorksheet('Cooking Instructions')
    instructionsSheet.columns = [
      { header: 'Dish Name', key: 'dish', width: 30 },
      { header: 'Texture', key: 'texture', width: 15 },
      { header: 'Instructions', key: 'instructions', width: 80 }
    ]

    cookingInstructions.forEach((instruction) => {
      instructionsSheet.addRow({
        dish: instruction.dish_name,
        texture: instruction.texture,
        instructions: instruction.instructions
      })
    })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="weekly-menu-${menu.week_start_date.toISOString().split('T')[0]}.xlsx"`
    )

    await workbook.xlsx.write(res)
    res.end()
  }
}

export const menuExportService = new MenuExportService()
