import { prisma } from '~/utils/db'
import { MealSlot } from '@prisma/client'
import { Response } from 'express'
import { servingsCalculationService } from './servings-calculation.service'
import * as path from 'path'
import * as fs from 'fs'

// Dynamic imports for optional dependencies
let pdfMake: any
let ExcelJS: any
let cachedFonts: any = {}
let cachedDefaultFont: string = 'Roboto'

async function loadPdfMake(): Promise<{ printer: any; defaultFont?: string } | null> {
  if (!pdfMake) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const PdfPrinter = require('pdfmake')

      // Find fonts that support Vietnamese
      const fontPaths = [
        // NotoSans (best for Vietnamese)
        path.join(process.cwd(), 'fonts', 'NotoSans-Regular.ttf'),
        '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
        // DejaVu Sans (good Vietnamese support)
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/TTF/DejaVuSans.ttf',
        // Liberation Sans
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
        // Arial Unicode (Windows/macOS)
        'C:/Windows/Fonts/arialuni.ttf',
        '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
        '/Library/Fonts/Arial Unicode.ttf'
      ]

      let fontPath: string | null = null
      let fontName = 'Roboto' // Default fallback

      for (const testPath of fontPaths) {
        try {
          if (fs.existsSync(testPath)) {
            fontPath = testPath
            // Determine font name based on path
            if (testPath.includes('NotoSans')) {
              fontName = 'NotoSans'
            } else if (testPath.includes('DejaVu')) {
              fontName = 'DejaVuSans'
            } else if (testPath.includes('Liberation')) {
              fontName = 'LiberationSans'
            } else if (testPath.includes('Arial')) {
              fontName = 'ArialUnicode'
            }
            break
          }
        } catch {
          // Continue
        }
      }

      const fonts: any = {}

      if (fontPath) {
        // Use found font for all variants
        fonts[fontName] = {
          normal: fontPath,
          bold: fontPath,
          italics: fontPath,
          bolditalics: fontPath
        }
        console.log(`PDF font loaded: ${fontName} from ${fontPath}`)
      } else {
        // Fallback: Use Roboto from pdfmake (if available) or empty fonts
        // pdfmake will handle empty fonts gracefully
        console.warn('No Vietnamese font found. Using default fonts.')
        console.warn('Please install NotoSans font or place it in ./fonts/ directory for better Vietnamese support')
      }

      // Create printer with fonts
      const printer = new PdfPrinter(fonts)

      // Cache for next time
      pdfMake = PdfPrinter
      cachedFonts = fonts
      cachedDefaultFont = fontName

      return { printer, defaultFont: fontName }
    } catch (error) {
      console.error('pdfmake not installed or error loading fonts:', error)
      return null
    }
  }

  // Return cached printer
  const PdfPrinter = pdfMake
  const printer = new PdfPrinter(cachedFonts)
  return { printer, defaultFont: cachedDefaultFont }
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
    let instructions = `1. Chuẩn bị nguyên liệu: ${ingredients.map((i) => `${i.amount}${i.unit} ${i.name}`).join(', ')}\n`

    if (texture === 'Regular') {
      instructions += `2. Nấu ${dishName} theo công thức chuẩn\n`
      instructions += `3. Phục vụ ở nhiệt độ phù hợp\n`
    } else if (texture === 'Minced') {
      instructions += `2. Nấu ${dishName} cho đến khi mềm\n`
      instructions += `3. Xay nhỏ hoặc băm nhuyễn tất cả nguyên liệu\n`
      instructions += `4. Trộn đều và phục vụ\n`
    } else if (texture === 'Pureed') {
      instructions += `2. Nấu ${dishName} cho đến khi rất mềm\n`
      instructions += `3. Xay nhuyễn cho đến khi mịn\n`
      instructions += `4. Lọc qua rây nếu cần để loại bỏ cục\n`
      instructions += `5. Phục vụ ở nhiệt độ phù hợp\n`
    }

    return instructions
  }

  /**
   * Export Menu as PDF using pdfmake (better Vietnamese support)
   */
  async exportMenuAsPDF(menu_id: string, res: Response): Promise<void> {
    // Load pdfmake printer with fonts
    const pdfMakeData = await loadPdfMake()
    if (!pdfMakeData || !pdfMakeData.printer) {
      throw new Error('PDF export is not available. Please install pdfmake: npm install pdfmake')
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

    // Calculate detailed servings breakdown including allergy-safe servings
    const servingsBreakdown = await servingsCalculationService.calculateMenuServingsBreakdown(
      menu_id,
      menu.institution_id
    )

    // Determine which font to use
    const fontName = pdfMakeData.defaultFont || 'Roboto'

    // Build document definition for pdfmake
    const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
    const mealSlotNames: Record<MealSlot, string> = {
      Breakfast: 'Bữa sáng',
      Lunch: 'Bữa trưa',
      Afternoon: 'Bữa xế',
      Dinner: 'Bữa tối'
    }
    const mealSlots: MealSlot[] = ['Breakfast', 'Lunch', 'Afternoon', 'Dinner']
    const textureNames: Record<string, string> = {
      Regular: 'Thường',
      Minced: 'Xay nhỏ',
      Pureed: 'Nghiền'
    }

    // Build menu schedule content
    const menuScheduleContent: any[] = []
    for (let day = 0; day < 7; day++) {
      const dayContent: any[] = [{ text: dayNames[day], style: 'dayHeader', margin: [0, 10, 0, 5] }]

      for (const slot of mealSlots) {
        const items = menu.menuItems.filter((item) => item.day_of_week === day && item.meal_slot === slot)

        if (items.length > 0) {
          const slotContent: any[] = [{ text: `${mealSlotNames[slot]}:`, style: 'mealSlot', margin: [0, 5, 0, 3] }]

          items.forEach((item) => {
            const breakdown = servingsBreakdown.dishes.find(
              (d) => d.dish_id === item.dish_id && d.day_of_week === day && d.meal_slot === slot
            )

            const regularServings = breakdown?.detailed_breakdown.regular_servings || 0
            const allergySafeServings = breakdown?.detailed_breakdown.special_servings.allergy_safe.count || 0
            const lowSugarServings = breakdown?.detailed_breakdown.special_servings.low_sugar.count || 0
            const lowSodiumServings = breakdown?.detailed_breakdown.special_servings.low_sodium.count || 0

            const dishContent: any[] = [{ text: `• ${item.dish.name}`, style: 'dishName', margin: [20, 2, 0, 2] }]

            if (breakdown && (allergySafeServings > 0 || lowSugarServings > 0 || lowSodiumServings > 0)) {
              dishContent.push({ text: `  Tổng: ${item.servings} phần`, style: 'servingDetail', margin: [30, 0, 0, 1] })
              if (regularServings > 0) {
                dishContent.push({
                  text: `  - Thường: ${regularServings} phần`,
                  style: 'servingRegular',
                  margin: [30, 0, 0, 1]
                })
              }
              if (allergySafeServings > 0) {
                dishContent.push({
                  text: `  - Không dị ứng: ${allergySafeServings} phần`,
                  style: 'servingAllergy',
                  margin: [30, 0, 0, 1]
                })
              }
              if (lowSugarServings > 0) {
                dishContent.push({
                  text: `  - Ít đường: ${lowSugarServings} phần`,
                  style: 'servingLowSugar',
                  margin: [30, 0, 0, 1]
                })
              }
              if (lowSodiumServings > 0) {
                dishContent.push({
                  text: `  - Ít muối: ${lowSodiumServings} phần`,
                  style: 'servingLowSodium',
                  margin: [30, 0, 0, 1]
                })
              }
            } else {
              dishContent.push({ text: `  (${item.servings} phần)`, style: 'servingSimple', margin: [30, 0, 0, 1] })
            }

            slotContent.push(...dishContent)
          })

          dayContent.push(...slotContent)
        }
      }

      menuScheduleContent.push(...dayContent)
    }

    // Build shopping list content
    const shoppingListContent = shoppingList.map((item) => ({
      text: `${item.ingredient_name}: ${item.total_amount}${item.unit}`,
      style: 'shoppingItem',
      margin: [20, 2, 0, 2]
    }))

    // Build cooking instructions content
    const cookingInstructionsContent: any[] = []
    cookingInstructions.forEach((instruction) => {
      cookingInstructionsContent.push(
        { text: instruction.dish_name, style: 'instructionDish', margin: [0, 10, 0, 5] },
        {
          text: `Kết cấu: ${textureNames[instruction.texture] || instruction.texture}`,
          style: 'instructionTexture',
          margin: [0, 0, 0, 5]
        },
        { text: instruction.instructions, style: 'instructionText', margin: [20, 0, 0, 10] }
      )
    })

    // Create PDF document definition
    const docDefinition = {
      defaultStyle: {
        font: fontName,
        fontSize: 10
      },
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10]
        },
        subheader: {
          fontSize: 12,
          alignment: 'center',
          margin: [0, 0, 0, 5]
        },
        weekInfo: {
          fontSize: 10,
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        sectionTitle: {
          fontSize: 16,
          bold: true,
          margin: [0, 10, 0, 10]
        },
        subsectionTitle: {
          fontSize: 12,
          bold: true,
          margin: [0, 5, 0, 5]
        },
        dayHeader: {
          fontSize: 14,
          bold: true,
          decoration: 'underline'
        },
        mealSlot: {
          fontSize: 12,
          bold: true
        },
        dishName: {
          fontSize: 10
        },
        servingDetail: {
          fontSize: 9,
          color: '#333333'
        },
        servingRegular: {
          fontSize: 9,
          color: '#666666'
        },
        servingAllergy: {
          fontSize: 9,
          color: '#d32f2f'
        },
        servingLowSugar: {
          fontSize: 9,
          color: '#f57c00'
        },
        servingLowSodium: {
          fontSize: 9,
          color: '#0288d1'
        },
        servingSimple: {
          fontSize: 10,
          color: '#666666'
        },
        shoppingItem: {
          fontSize: 12
        },
        instructionDish: {
          fontSize: 14,
          bold: true,
          decoration: 'underline'
        },
        instructionTexture: {
          fontSize: 10
        },
        instructionText: {
          fontSize: 10
        },
        summaryItem: {
          fontSize: 10,
          margin: [0, 2, 0, 2]
        },
        summaryItemHighlight: {
          fontSize: 10,
          margin: [0, 2, 0, 2]
        }
      },
      content: [
        // Header
        { text: 'Kế hoạch thực đơn tuần', style: 'header' },
        { text: menu.institution.name, style: 'subheader' },
        {
          text: `Tuần: ${menu.week_start_date.toDateString()} - ${menu.week_end_date.toDateString()}`,
          style: 'weekInfo'
        },
        // Weekly Menu Schedule
        { text: 'Lịch thực đơn tuần', style: 'sectionTitle' },
        ...menuScheduleContent,
        // Servings Summary (new page)
        { text: 'Tóm tắt số phần ăn', style: 'sectionTitle', pageBreak: 'before' },
        { text: 'Tổng quan:', style: 'subsectionTitle' },
        { text: `Tổng số cư dân: ${servingsBreakdown.total_residents}`, style: 'summaryItem' },
        { text: `Tổng phần thường: ${servingsBreakdown.summary.total_regular_servings}`, style: 'summaryItem' },
        {
          text: `Tổng phần không dị ứng: ${servingsBreakdown.summary.total_allergy_safe_servings}`,
          style: 'summaryItemHighlight',
          color: '#d32f2f'
        },
        {
          text: `Tổng phần ít đường: ${servingsBreakdown.summary.total_low_sugar_servings}`,
          style: 'summaryItemHighlight',
          color: '#f57c00'
        },
        {
          text: `Tổng phần ít muối: ${servingsBreakdown.summary.total_low_sodium_servings}`,
          style: 'summaryItemHighlight',
          color: '#0288d1'
        },
        { text: `Tổng phần xay nhỏ: ${servingsBreakdown.summary.total_minced_servings}`, style: 'summaryItem' },
        { text: `Tổng phần nghiền: ${servingsBreakdown.summary.total_pureed_servings}`, style: 'summaryItem' },
        // Shopping List (new page)
        { text: 'Danh sách mua sắm', style: 'sectionTitle', pageBreak: 'before' },
        ...shoppingListContent,
        // Cooking Instructions (new page)
        { text: 'Hướng dẫn nấu ăn', style: 'sectionTitle', pageBreak: 'before' },
        ...cookingInstructionsContent
      ],
      pageMargins: [50, 50, 50, 50]
    }

    try {
      // Create PDF document
      const pdfDoc = pdfMakeData.printer.createPdfKitDocument(docDefinition)

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="weekly-menu-${menu.week_start_date.toISOString().split('T')[0]}.pdf"`
      )

      pdfDoc.pipe(res)
      pdfDoc.end()
    } catch (error) {
      console.error('Error creating PDF:', error)
      if (!res.headersSent) {
        res.status(500).json({
          message: 'Failed to generate PDF',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
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

    // Calculate detailed servings breakdown including allergy-safe servings
    const servingsBreakdown = await servingsCalculationService.calculateMenuServingsBreakdown(
      menu_id,
      menu.institution_id
    )

    const workbook = new Excel.Workbook()
    const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
    const mealSlotNames: Record<MealSlot, string> = {
      Breakfast: 'Bữa sáng',
      Lunch: 'Bữa trưa',
      Afternoon: 'Bữa xế',
      Dinner: 'Bữa tối'
    }
    const textureNames: Record<string, string> = {
      Regular: 'Thường',
      Minced: 'Xay nhỏ',
      Pureed: 'Nghiền'
    }
    const mealSlots: MealSlot[] = ['Breakfast', 'Lunch', 'Afternoon', 'Dinner']

    // Sheet 1: Weekly Menu
    const menuSheet = workbook.addWorksheet('Thực đơn tuần')
    menuSheet.columns = [
      { header: 'Ngày', key: 'day', width: 15 },
      { header: 'Bữa ăn', key: 'slot', width: 15 },
      { header: 'Tên món', key: 'dish', width: 30 },
      { header: 'Tổng phần', key: 'servings', width: 12 },
      { header: 'Thường', key: 'regular', width: 10 },
      { header: 'Không dị ứng', key: 'allergy_safe', width: 12 },
      { header: 'Ít đường', key: 'low_sugar', width: 10 },
      { header: 'Ít muối', key: 'low_sodium', width: 10 },
      { header: 'Kết cấu', key: 'texture', width: 15 }
    ]

    for (let day = 0; day < 7; day++) {
      for (const slot of mealSlots) {
        const items = menu.menuItems.filter((item) => item.day_of_week === day && item.meal_slot === slot)

        if (items.length > 0) {
          items.forEach((item) => {
            // Find breakdown for this dish
            const breakdown = servingsBreakdown.dishes.find(
              (d) => d.dish_id === item.dish_id && d.day_of_week === day && d.meal_slot === slot
            )

            const texture = item.texture_variant || item.dish.texture

            menuSheet.addRow({
              day: dayNames[day],
              slot: mealSlotNames[slot],
              dish: item.dish.name,
              servings: item.servings,
              regular: breakdown?.detailed_breakdown.regular_servings || item.servings,
              allergy_safe: breakdown?.detailed_breakdown.special_servings.allergy_safe.count || 0,
              low_sugar: breakdown?.detailed_breakdown.special_servings.low_sugar.count || 0,
              low_sodium: breakdown?.detailed_breakdown.special_servings.low_sodium.count || 0,
              texture: textureNames[texture] || texture
            })
          })
        }
      }
    }

    // Sheet 2: Shopping List
    const shoppingSheet = workbook.addWorksheet('Danh sách mua sắm')
    shoppingSheet.columns = [
      { header: 'Nguyên liệu', key: 'ingredient', width: 30 },
      { header: 'Số lượng', key: 'amount', width: 15 },
      { header: 'Đơn vị', key: 'unit', width: 10 }
    ]

    shoppingList.forEach((item) => {
      shoppingSheet.addRow({
        ingredient: item.ingredient_name,
        amount: item.total_amount,
        unit: item.unit
      })
    })

    // Sheet 3: Servings Summary
    const summarySheet = workbook.addWorksheet('Tóm tắt số phần')
    summarySheet.columns = [
      { header: 'Loại phần', key: 'type', width: 25 },
      { header: 'Số lượng', key: 'count', width: 15 }
    ]

    summarySheet.addRow({ type: 'Tổng số cư dân', count: servingsBreakdown.total_residents })
    summarySheet.addRow({ type: 'Tổng phần thường', count: servingsBreakdown.summary.total_regular_servings })
    summarySheet.addRow({
      type: 'Tổng phần không dị ứng',
      count: servingsBreakdown.summary.total_allergy_safe_servings
    })
    summarySheet.addRow({ type: 'Tổng phần ít đường', count: servingsBreakdown.summary.total_low_sugar_servings })
    summarySheet.addRow({ type: 'Tổng phần ít muối', count: servingsBreakdown.summary.total_low_sodium_servings })
    summarySheet.addRow({ type: 'Tổng phần xay nhỏ', count: servingsBreakdown.summary.total_minced_servings })
    summarySheet.addRow({ type: 'Tổng phần nghiền', count: servingsBreakdown.summary.total_pureed_servings })

    // Sheet 4: Cooking Instructions
    const instructionsSheet = workbook.addWorksheet('Hướng dẫn nấu ăn')
    instructionsSheet.columns = [
      { header: 'Tên món', key: 'dish', width: 30 },
      { header: 'Kết cấu', key: 'texture', width: 15 },
      { header: 'Hướng dẫn', key: 'instructions', width: 80 }
    ]

    cookingInstructions.forEach((instruction) => {
      instructionsSheet.addRow({
        dish: instruction.dish_name,
        texture: textureNames[instruction.texture] || instruction.texture,
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
