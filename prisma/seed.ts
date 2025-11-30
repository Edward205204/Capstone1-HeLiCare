import { hashPassword } from '../src/utils/hash'
import {
  UserRole,
  UserStatus,
  DishTexture,
  IngredientUnit,
  StaffPosition,
  InstitutionContractStatus,
  Gender,
  RoomType,
  ActivityType,
  ScheduleFrequency,
  ActivityStatus,
  CareLogType,
  PostVisibility,
  VisitStatus,
  VisitTimeBlock,
  CognitiveStatus,
  MobilityStatus,
  DiseaseSeverity,
  DiseaseStatus,
  AllergySeverity,
  MedicationForm,
  MedicationTiming,
  TimeSlot,
  FamilyLinkStatus,
  FeedbackStatus,
  EventType,
  EventStatus,
  CareSubType,
  EventFrequency
} from '@prisma/client'
import { prisma } from './../src/utils/db'
import { env } from '../src/utils/dot.env'
import AddressJson from '../src/models/address_json'
import { ContactJson } from '../src/models/contact_json'

export async function main() {
  // 1. Xóa tất cả super users (nếu bảng tồn tại)
  try {
    await prisma.user.deleteMany({
      where: {
        role: UserRole.PlatformSuperAdmin
      }
    })
    console.log('Deleted all PlatformSuperAdmin roles')
  } catch (error: any) {
    // Bảng chưa tồn tại, bỏ qua
    if (error.code === 'P2021') {
      console.log('User table does not exist yet, skipping delete')
    } else {
      throw error
    }
  }

  const superUsers = env.PLATFORM_SUPER_ADMIN_EMAIL?.split(',')
  if (!superUsers) {
    throw new Error('PLATFORM_SUPER_ADMIN_EMAIL is not set')
  }

  const hashedPassword = await hashPassword(env.DEFAULT_PASSWORD || '123456')

  for (const email of superUsers) {
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword.password,
        role: UserRole.PlatformSuperAdmin,
        status: UserStatus.active
      }
    })
    console.log(email)
  }

  console.log('Seeded PlatformSuperAdmin:', superUsers)

  // 2. Seed institutions with full data
  console.log('Seeding institutions...')

  const institutionsData: Array<{
    name: string
    address: AddressJson
    contact_info: ContactJson
  }> = [
    {
      name: 'Viện Dưỡng Lão An Khang',
      address: {
        province: 'Thành phố Hồ Chí Minh',
        district: 'Quận 1',
        ward: 'Phường Bến Nghé',
        street: 'Đường Nguyễn Huệ',
        house_number: '123'
      },
      contact_info: {
        email: 'ankhang@helincare.vn',
        phone: '0281234567',
        facebook: 'https://facebook.com/vienankhang'
      }
    },
    {
      name: 'Viện Dưỡng Lão Hoa Viên',
      address: {
        province: 'Thành phố Hồ Chí Minh',
        district: 'Quận 3',
        ward: 'Phường Võ Thị Sáu',
        street: 'Đường Lê Văn Sỹ',
        house_number: '456'
      },
      contact_info: {
        email: 'hoavien@helincare.vn',
        phone: '0282345678',
        facebook: 'https://facebook.com/vienhoavien'
      }
    },
    {
      name: 'Viện Dưỡng Lão Bình An',
      address: {
        province: 'Thành phố Hồ Chí Minh',
        district: 'Quận 7',
        ward: 'Phường Tân Phú',
        street: 'Đường Nguyễn Thị Thập',
        house_number: '789'
      },
      contact_info: {
        email: 'binhan@helincare.vn',
        phone: '0283456789'
      }
    },
    {
      name: 'Viện Dưỡng Lão Thiên Đức',
      address: {
        province: 'Hà Nội',
        district: 'Quận Ba Đình',
        ward: 'Phường Điện Biên',
        street: 'Đường Hoàng Diệu',
        house_number: '321'
      },
      contact_info: {
        email: 'thienduc@helincare.vn',
        phone: '0241234567',
        facebook: 'https://facebook.com/vienthienduc'
      }
    },
    {
      name: 'Viện Dưỡng Lão Phúc Lâm',
      address: {
        province: 'Đà Nẵng',
        district: 'Quận Hải Châu',
        ward: 'Phường Thanh Bình',
        street: 'Đường Lê Duẩn',
        house_number: '654'
      },
      contact_info: {
        email: 'phuclam@helincare.vn',
        phone: '0236123456'
      }
    }
  ]

  const createdInstitutions: any[] = []
  for (const instData of institutionsData) {
    // Check if institution already exists by name
    const existing = await prisma.institution.findFirst({
      where: { name: instData.name }
    })

    if (existing) {
      console.log(`Institution "${instData.name}" already exists, skipping...`)
      createdInstitutions.push(existing)
      continue
    }

    const institution = await prisma.institution.create({
      data: {
        name: instData.name,
        address: instData.address as any,
        contact_info: instData.contact_info as any,
        status: InstitutionContractStatus.active
      }
    })

    createdInstitutions.push(institution)
    console.log(`Created institution: ${instData.name} (${institution.institution_id})`)
  }

  console.log(`Created ${createdInstitutions.length} institutions`)

  // 3. Seed default feedback categories for all institutions
  const allInstitutions = await prisma.institution.findMany()
  for (const institution of allInstitutions) {
    // Check if categories already exist
    const existingCategories = await prisma.feedbackCategory.findMany({
      where: { institution_id: institution.institution_id }
    })

    if (existingCategories.length === 0) {
      // Create default categories
      await Promise.all([
        prisma.feedbackCategory.create({
          data: {
            institution_id: institution.institution_id,
            name: 'Complaint',
            description: 'General complaints and concerns',
            metadata: {
              types: ['Service Quality', 'Staff Behavior', 'Facility Issues', 'Other'],
              attachmentsRequired: false,
              urgency: 'medium'
            },
            is_active: true
          }
        }),
        prisma.feedbackCategory.create({
          data: {
            institution_id: institution.institution_id,
            name: 'Suggestion',
            description: 'Suggestions for improvement',
            metadata: {
              types: ['Process Improvement', 'Service Enhancement', 'Facility Upgrade', 'Other'],
              attachmentsRequired: false,
              urgency: 'low'
            },
            is_active: true
          }
        }),
        prisma.feedbackCategory.create({
          data: {
            institution_id: institution.institution_id,
            name: 'Request',
            description: 'Service or assistance requests',
            metadata: {
              types: ['Medical Request', 'Dietary Request', 'Activity Request', 'Other'],
              attachmentsRequired: false,
              urgency: 'high'
            },
            is_active: true
          }
        }),
        prisma.feedbackCategory.create({
          data: {
            institution_id: institution.institution_id,
            name: 'Inquiry',
            description: 'General inquiries and questions',
            metadata: {
              types: ['Information Request', 'Status Inquiry', 'Policy Question', 'Other'],
              attachmentsRequired: false,
              urgency: 'low'
            },
            is_active: true
          }
        })
      ])
      console.log(`Created default feedback categories for institution: ${institution.institution_id}`)
    }
  }

  // 4. Seed dishes and ingredients for first institution
  const firstInstitution = await prisma.institution.findFirst()
  if (firstInstitution) {
    console.log('Seeding dishes and ingredients for institution:', firstInstitution.institution_id)

    // Create ingredients
    const ingredients = await Promise.all([
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-chicken-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-chicken-100g',
          institution_id: firstInstitution.institution_id,
          name: 'Chicken Breast',
          unit: IngredientUnit.g,
          calories_per_100g: 165,
          protein_per_100g: 31,
          fat_per_100g: 3.6,
          carbs_per_100g: 0,
          fiber_per_100g: 0,
          sodium_per_100g: 74
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-rice-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-rice-100g',
          institution_id: firstInstitution.institution_id,
          name: 'White Rice',
          unit: IngredientUnit.g,
          calories_per_100g: 130,
          protein_per_100g: 2.7,
          fat_per_100g: 0.3,
          carbs_per_100g: 28,
          fiber_per_100g: 0.4,
          sodium_per_100g: 1
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-vegetables-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-vegetables-100g',
          institution_id: firstInstitution.institution_id,
          name: 'Mixed Vegetables',
          unit: IngredientUnit.g,
          calories_per_100g: 50,
          protein_per_100g: 2,
          fat_per_100g: 0.2,
          carbs_per_100g: 10,
          fiber_per_100g: 3,
          sodium_per_100g: 30
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-fish-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-fish-100g',
          institution_id: firstInstitution.institution_id,
          name: 'Salmon Fillet',
          unit: IngredientUnit.g,
          calories_per_100g: 208,
          protein_per_100g: 20,
          fat_per_100g: 12,
          carbs_per_100g: 0,
          fiber_per_100g: 0,
          sodium_per_100g: 44
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-egg-1pcs' },
        update: {},
        create: {
          ingredient_id: 'seed-egg-1pcs',
          institution_id: firstInstitution.institution_id,
          name: 'Egg',
          unit: IngredientUnit.pcs,
          calories_per_100g: 155,
          protein_per_100g: 13,
          fat_per_100g: 11,
          carbs_per_100g: 1.1,
          fiber_per_100g: 0,
          sodium_per_100g: 124
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-oatmeal-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-oatmeal-100g',
          institution_id: firstInstitution.institution_id,
          name: 'Oatmeal',
          unit: IngredientUnit.g,
          calories_per_100g: 389,
          protein_per_100g: 17,
          fat_per_100g: 7,
          carbs_per_100g: 66,
          fiber_per_100g: 11,
          sodium_per_100g: 2
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-bread-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-bread-100g',
          institution_id: firstInstitution.institution_id,
          name: 'Whole Wheat Bread',
          unit: IngredientUnit.g,
          calories_per_100g: 247,
          protein_per_100g: 13,
          fat_per_100g: 4.2,
          carbs_per_100g: 41,
          fiber_per_100g: 7,
          sodium_per_100g: 491
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-milk-100ml' },
        update: {},
        create: {
          ingredient_id: 'seed-milk-100ml',
          institution_id: firstInstitution.institution_id,
          name: 'Low-Fat Milk',
          unit: IngredientUnit.ml,
          calories_per_100g: 42,
          protein_per_100g: 3.4,
          fat_per_100g: 1,
          carbs_per_100g: 5,
          fiber_per_100g: 0,
          sodium_per_100g: 44
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-beef-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-beef-100g',
          institution_id: firstInstitution.institution_id,
          name: 'Lean Beef',
          unit: IngredientUnit.g,
          calories_per_100g: 250,
          protein_per_100g: 26,
          fat_per_100g: 17,
          carbs_per_100g: 0,
          fiber_per_100g: 0,
          sodium_per_100g: 72
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-tofu-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-tofu-100g',
          institution_id: firstInstitution.institution_id,
          name: 'Tofu',
          unit: IngredientUnit.g,
          calories_per_100g: 76,
          protein_per_100g: 8,
          fat_per_100g: 4.8,
          carbs_per_100g: 1.9,
          fiber_per_100g: 0.3,
          sodium_per_100g: 7
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-pasta-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-pasta-100g',
          institution_id: firstInstitution.institution_id,
          name: 'Whole Wheat Pasta',
          unit: IngredientUnit.g,
          calories_per_100g: 124,
          protein_per_100g: 5,
          fat_per_100g: 1.1,
          carbs_per_100g: 25,
          fiber_per_100g: 3.2,
          sodium_per_100g: 1
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-tomato-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-tomato-100g',
          institution_id: firstInstitution.institution_id,
          name: 'Tomato',
          unit: IngredientUnit.g,
          calories_per_100g: 18,
          protein_per_100g: 0.9,
          fat_per_100g: 0.2,
          carbs_per_100g: 3.9,
          fiber_per_100g: 1.2,
          sodium_per_100g: 5
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-onion-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-onion-100g',
          institution_id: firstInstitution.institution_id,
          name: 'Onion',
          unit: IngredientUnit.g,
          calories_per_100g: 40,
          protein_per_100g: 1.1,
          fat_per_100g: 0.1,
          carbs_per_100g: 9.3,
          fiber_per_100g: 1.7,
          sodium_per_100g: 4
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-carrot-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-carrot-100g',
          institution_id: firstInstitution.institution_id,
          name: 'Carrot',
          unit: IngredientUnit.g,
          calories_per_100g: 41,
          protein_per_100g: 0.9,
          fat_per_100g: 0.2,
          carbs_per_100g: 9.6,
          fiber_per_100g: 2.8,
          sodium_per_100g: 69
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-potato-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-potato-100g',
          institution_id: firstInstitution.institution_id,
          name: 'Potato',
          unit: IngredientUnit.g,
          calories_per_100g: 77,
          protein_per_100g: 2,
          fat_per_100g: 0.1,
          carbs_per_100g: 17,
          fiber_per_100g: 2.2,
          sodium_per_100g: 6
        }
      }),
      prisma.ingredient.upsert({
        where: { ingredient_id: 'seed-peanut-butter-100g' },
        update: {},
        create: {
          ingredient_id: 'seed-peanut-butter-100g',
          institution_id: firstInstitution.institution_id,
          name: 'Peanut Butter',
          unit: IngredientUnit.g,
          calories_per_100g: 588,
          protein_per_100g: 25,
          fat_per_100g: 50,
          carbs_per_100g: 20,
          fiber_per_100g: 6,
          sodium_per_100g: 17
        }
      })
    ])

    console.log('Created', ingredients.length, 'ingredients')

    // Create dishes
    const dishes = await Promise.all([
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-1' },
        update: {},
        create: {
          dish_id: 'seed-dish-1',
          institution_id: firstInstitution.institution_id,
          name: 'Grilled Chicken with Rice',
          calories_per_100g: 180,
          texture: DishTexture.Regular,
          sugar_adjustable: false,
          sodium_level: 200,
          dietary_flags: ['high_protein', 'low_fat'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[0].ingredient_id, amount: 150 }, // 150g chicken
              { ingredient_id: ingredients[1].ingredient_id, amount: 200 } // 200g rice
            ]
          }
        }
      }),
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-2' },
        update: {},
        create: {
          dish_id: 'seed-dish-2',
          institution_id: firstInstitution.institution_id,
          name: 'Steamed Salmon with Vegetables',
          calories_per_100g: 150,
          texture: DishTexture.Regular,
          sugar_adjustable: false,
          sodium_level: 150,
          dietary_flags: ['high_protein', 'omega3', 'low_sodium'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[3].ingredient_id, amount: 120 }, // 120g salmon
              { ingredient_id: ingredients[2].ingredient_id, amount: 150 } // 150g vegetables
            ]
          }
        }
      }),
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-3' },
        update: {},
        create: {
          dish_id: 'seed-dish-3',
          institution_id: firstInstitution.institution_id,
          name: 'Scrambled Eggs with Toast',
          calories_per_100g: 200,
          texture: DishTexture.Regular,
          sugar_adjustable: false,
          sodium_level: 400,
          dietary_flags: ['high_protein', 'breakfast'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[4].ingredient_id, amount: 2 }, // 2 eggs
              { ingredient_id: ingredients[6].ingredient_id, amount: 100 } // 100g bread
            ]
          }
        }
      }),
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-4' },
        update: {},
        create: {
          dish_id: 'seed-dish-4',
          institution_id: firstInstitution.institution_id,
          name: 'Oatmeal Bowl',
          calories_per_100g: 120,
          texture: DishTexture.Regular,
          sugar_adjustable: true,
          sodium_level: 5,
          dietary_flags: ['diabetic', 'high_fiber', 'low_sodium'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[5].ingredient_id, amount: 80 }, // 80g oatmeal
              { ingredient_id: ingredients[7].ingredient_id, amount: 200 } // 200ml milk
            ]
          }
        }
      }),
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-5' },
        update: {},
        create: {
          dish_id: 'seed-dish-5',
          institution_id: firstInstitution.institution_id,
          name: 'Chicken Soup',
          calories_per_100g: 80,
          texture: DishTexture.Regular,
          sugar_adjustable: false,
          sodium_level: 300,
          dietary_flags: ['low_calorie', 'comfort_food'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[0].ingredient_id, amount: 100 }, // 100g chicken
              { ingredient_id: ingredients[2].ingredient_id, amount: 100 } // 100g vegetables
            ]
          }
        }
      }),
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-6' },
        update: {},
        create: {
          dish_id: 'seed-dish-6',
          institution_id: firstInstitution.institution_id,
          name: 'Vegetable Stir Fry',
          calories_per_100g: 60,
          texture: DishTexture.Regular,
          sugar_adjustable: false,
          sodium_level: 200,
          dietary_flags: ['vegetarian', 'low_calorie', 'high_fiber'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[2].ingredient_id, amount: 250 } // 250g vegetables
            ]
          }
        }
      }),
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-7' },
        update: {},
        create: {
          dish_id: 'seed-dish-7',
          institution_id: firstInstitution.institution_id,
          name: 'Rice Porridge',
          calories_per_100g: 50,
          texture: DishTexture.Regular,
          sugar_adjustable: false,
          sodium_level: 100,
          dietary_flags: ['easy_digest', 'comfort_food'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[1].ingredient_id, amount: 150 } // 150g rice
            ]
          }
        }
      }),
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-8' },
        update: {},
        create: {
          dish_id: 'seed-dish-8',
          institution_id: firstInstitution.institution_id,
          name: 'Pureed Chicken Soup',
          calories_per_100g: 80,
          texture: DishTexture.Pureed,
          sugar_adjustable: false,
          sodium_level: 300,
          dietary_flags: ['dysphagia', 'easy_digest'],
          is_blendable: false,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[0].ingredient_id, amount: 100 }, // 100g chicken
              { ingredient_id: ingredients[2].ingredient_id, amount: 100 } // 100g vegetables
            ]
          }
        }
      }),
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-9' },
        update: {},
        create: {
          dish_id: 'seed-dish-9',
          institution_id: firstInstitution.institution_id,
          name: 'Beef Stew',
          calories_per_100g: 220,
          texture: DishTexture.Regular,
          sugar_adjustable: false,
          sodium_level: 450,
          dietary_flags: ['high_protein', 'comfort_food'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[8].ingredient_id, amount: 150 }, // 150g beef
              { ingredient_id: ingredients[11].ingredient_id, amount: 100 }, // 100g potato
              { ingredient_id: ingredients[10].ingredient_id, amount: 50 }, // 50g carrot
              { ingredient_id: ingredients[9].ingredient_id, amount: 30 } // 30g onion
            ]
          }
        }
      }),
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-10' },
        update: {},
        create: {
          dish_id: 'seed-dish-10',
          institution_id: firstInstitution.institution_id,
          name: 'Minced Chicken with Rice',
          calories_per_100g: 160,
          texture: DishTexture.Minced,
          sugar_adjustable: false,
          sodium_level: 180,
          dietary_flags: ['dysphagia', 'high_protein', 'low_sodium'],
          is_blendable: false,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[0].ingredient_id, amount: 120 }, // 120g chicken
              { ingredient_id: ingredients[1].ingredient_id, amount: 180 } // 180g rice
            ]
          }
        }
      }),
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-11' },
        update: {},
        create: {
          dish_id: 'seed-dish-11',
          institution_id: firstInstitution.institution_id,
          name: 'Tomato Pasta (Gluten-Free)',
          calories_per_100g: 140,
          texture: DishTexture.Regular,
          sugar_adjustable: false,
          sodium_level: 250,
          dietary_flags: ['gluten_free', 'vegetarian', 'low_calorie'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[10].ingredient_id, amount: 200 }, // 200g tomato
              { ingredient_id: ingredients[9].ingredient_id, amount: 50 }, // 50g onion
              { ingredient_id: ingredients[11].ingredient_id, amount: 150 } // 150g pasta (gluten-free alternative)
            ]
          }
        }
      }),
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-12' },
        update: {},
        create: {
          dish_id: 'seed-dish-12',
          institution_id: firstInstitution.institution_id,
          name: 'Tofu Stir Fry (Lactose-Free)',
          calories_per_100g: 90,
          texture: DishTexture.Regular,
          sugar_adjustable: false,
          sodium_level: 150,
          dietary_flags: ['lactose_free', 'vegetarian', 'low_sodium', 'high_protein'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[9].ingredient_id, amount: 200 }, // 200g tofu
              { ingredient_id: ingredients[2].ingredient_id, amount: 150 }, // 150g mixed vegetables
              { ingredient_id: ingredients[10].ingredient_id, amount: 100 } // 100g carrot
            ]
          }
        }
      }),
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-13' },
        update: {},
        create: {
          dish_id: 'seed-dish-13',
          institution_id: firstInstitution.institution_id,
          name: 'Diabetic-Friendly Oatmeal',
          calories_per_100g: 110,
          texture: DishTexture.Regular,
          sugar_adjustable: true,
          sodium_level: 3,
          dietary_flags: ['diabetic', 'low_sugar', 'low_sodium', 'high_fiber'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[5].ingredient_id, amount: 70 }, // 70g oatmeal
              { ingredient_id: ingredients[10].ingredient_id, amount: 50 } // 50g carrot (for natural sweetness)
            ]
          }
        }
      }),
      // High sodium dish for testing low salt warnings
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-14' },
        update: {},
        create: {
          dish_id: 'seed-dish-14',
          institution_id: firstInstitution.institution_id,
          name: 'Salted Fish with Rice',
          calories_per_100g: 180,
          texture: DishTexture.Regular,
          sugar_adjustable: false,
          sodium_level: 650, // High sodium - should trigger warning
          dietary_flags: ['high_protein', 'traditional'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[3].ingredient_id, amount: 150 }, // 150g fish
              { ingredient_id: ingredients[1].ingredient_id, amount: 200 } // 200g rice
            ]
          }
        }
      }),
      // Dish with allergens (peanuts) for testing allergy warnings
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-15' },
        update: {},
        create: {
          dish_id: 'seed-dish-15',
          institution_id: firstInstitution.institution_id,
          name: 'Peanut Butter Toast',
          calories_per_100g: 320,
          texture: DishTexture.Regular,
          sugar_adjustable: false,
          sodium_level: 400,
          dietary_flags: ['peanuts', 'high_calorie', 'breakfast'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[6].ingredient_id, amount: 100 }, // 100g bread
              { ingredient_id: ingredients[13].ingredient_id, amount: 30 } // 30g peanut butter
            ]
          }
        }
      }),
      // Dish with milk/lactose for testing allergy warnings
      prisma.dish.upsert({
        where: { dish_id: 'seed-dish-16' },
        update: {},
        create: {
          dish_id: 'seed-dish-16',
          institution_id: firstInstitution.institution_id,
          name: 'Creamy Milk Soup',
          calories_per_100g: 120,
          texture: DishTexture.Regular,
          sugar_adjustable: false,
          sodium_level: 250,
          dietary_flags: ['milk', 'lactose', 'comfort_food'],
          is_blendable: true,
          dishIngredients: {
            create: [
              { ingredient_id: ingredients[7].ingredient_id, amount: 300 }, // 300ml milk
              { ingredient_id: ingredients[2].ingredient_id, amount: 100 } // 100g vegetables
            ]
          }
        }
      })
    ])

    console.log('Created', dishes.length, 'dishes')
  } else {
    console.log('No institution found, skipping dish/ingredient seeding')
  }

  // 5. Seed staff users with full data
  // Use created institutions or fetch from DB
  const allInstitutionsForStaff =
    createdInstitutions.length > 0 ? createdInstitutions : await prisma.institution.findMany()

  if (allInstitutionsForStaff.length > 0) {
    console.log('Seeding staff users...')

    // Get some residents to assign to staff (from first institution)
    const residents = await prisma.resident.findMany({
      take: 20,
      where: {
        institution_id: allInstitutionsForStaff[0].institution_id
      }
    })

    const staffData = [
      {
        email: 'khoa123kd56cn2@gmail.com',
        password: '123123@MinhKhoa',
        full_name: 'Nguyễn Minh Khoa',
        phone: '0901234567',
        position: StaffPosition.PHYSICIAN,
        notes: 'Bác sĩ chính phụ trách theo dõi sức khỏe tổng quát cho cư dân',
        institutionIndex: 0
      },
      {
        email: 'nguyenvana@helincare.vn',
        password: '123456',
        full_name: 'Nguyễn Văn An',
        phone: '0901111111',
        position: StaffPosition.NURSE,
        notes: 'Y tá có kinh nghiệm 10 năm trong chăm sóc người cao tuổi',
        institutionIndex: 0
      },
      {
        email: 'tranthib@helincare.vn',
        password: '123456',
        full_name: 'Trần Thị Bình',
        phone: '0902222222',
        position: StaffPosition.CAREGIVER,
        notes: 'Nhân viên chăm sóc tận tâm, hỗ trợ sinh hoạt hàng ngày',
        institutionIndex: 0
      },
      {
        email: 'levanc@helincare.vn',
        password: '123456',
        full_name: 'Lê Văn Cường',
        phone: '0903333333',
        position: StaffPosition.THERAPIST,
        notes: 'Chuyên viên vật lý trị liệu, hỗ trợ phục hồi chức năng',
        institutionIndex: 0
      },
      {
        email: 'phamthid@helincare.vn',
        password: '123456',
        full_name: 'Phạm Thị Dung',
        phone: '0904444444',
        position: StaffPosition.SOCIAL_WORKER,
        notes: 'Nhân viên xã hội, tư vấn tâm lý và hỗ trợ gia đình',
        institutionIndex: 0
      },
      {
        email: 'hoangvane@helincare.vn',
        password: '123456',
        full_name: 'Hoàng Văn Em',
        phone: '0905555555',
        position: StaffPosition.ACTIVITY_COORDINATOR,
        notes: 'Điều phối viên hoạt động, tổ chức các chương trình giải trí',
        institutionIndex: 0
      },
      {
        email: 'vuthif@helincare.vn',
        password: '123456',
        full_name: 'Vũ Thị Phương',
        phone: '0906666666',
        position: StaffPosition.DIETITIAN,
        notes: 'Chuyên viên dinh dưỡng, lập kế hoạch bữa ăn phù hợp',
        institutionIndex: 0
      },
      {
        email: 'dangvang@helincare.vn',
        password: '123456',
        full_name: 'Đặng Văn Giang',
        phone: '0907777777',
        position: StaffPosition.NURSE,
        notes: 'Y tá ca đêm, có kinh nghiệm xử lý các tình huống khẩn cấp',
        institutionIndex: 0
      },
      {
        email: 'buitthih@helincare.vn',
        password: '123456',
        full_name: 'Bùi Thị Hoa',
        phone: '0908888888',
        position: StaffPosition.CAREGIVER,
        notes: 'Nhân viên chăm sóc chuyên nghiệp, yêu thương cư dân như người thân',
        institutionIndex: 0
      },
      {
        email: 'nguyenvani@helincare.vn',
        password: '123456',
        full_name: 'Nguyễn Văn Ích',
        phone: '0909999999',
        position: StaffPosition.OTHER,
        notes: 'Nhân viên hỗ trợ đa năng, phụ trách vệ sinh và bảo trì',
        institutionIndex: 0
      },
      {
        email: 'tranthik@helincare.vn',
        password: '123456',
        full_name: 'Trần Thị Kim',
        phone: '0910000000',
        position: StaffPosition.NURSE,
        notes: 'Y tá trưởng, quản lý đội ngũ y tá và đào tạo nhân viên mới',
        institutionIndex: 0
      },
      {
        email: 'levanl@helincare.vn',
        password: '123456',
        full_name: 'Lê Văn Long',
        phone: '0911111111',
        position: StaffPosition.PHYSICIAN,
        notes: 'Bác sĩ chuyên khoa tim mạch, khám định kỳ cho cư dân',
        institutionIndex: 0
      },
      {
        email: 'phamthim@helincare.vn',
        password: '123456',
        full_name: 'Phạm Thị Mai',
        phone: '0912222222',
        position: StaffPosition.DIETITIAN,
        notes: 'Chuyên viên dinh dưỡng cao cấp, chuyên về chế độ ăn cho bệnh nhân tiểu đường',
        institutionIndex: 0
      },
      {
        email: 'hoangvann@helincare.vn',
        password: '123456',
        full_name: 'Hoàng Văn Nam',
        phone: '0913333333',
        position: StaffPosition.THERAPIST,
        notes: 'Chuyên viên vật lý trị liệu, chuyên về phục hồi sau đột quỵ',
        institutionIndex: 0
      },
      {
        email: 'vuthio@helincare.vn',
        password: '123456',
        full_name: 'Vũ Thị Oanh',
        phone: '0914444444',
        position: StaffPosition.CAREGIVER,
        notes: 'Nhân viên chăm sóc có chứng chỉ chăm sóc người cao tuổi',
        institutionIndex: 0
      }
    ]

    const createdStaff: any[] = []
    for (const staffInfo of staffData) {
      const institution = allInstitutionsForStaff[staffInfo.institutionIndex] || allInstitutionsForStaff[0]

      // Hash password
      const hashedPassword = await hashPassword(staffInfo.password)

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: staffInfo.email }
      })

      if (existingUser) {
        console.log(`Staff user ${staffInfo.email} already exists, skipping...`)
        continue
      }

      // Create user first
      const staffUser = await prisma.user.create({
        data: {
          email: staffInfo.email,
          password: hashedPassword.password,
          role: UserRole.Staff,
          status: UserStatus.active,
          institution_id: institution.institution_id
        }
      })

      // Create staff profile
      await prisma.staffProfile.create({
        data: {
          user_id: staffUser.user_id,
          institution_id: institution.institution_id,
          full_name: staffInfo.full_name,
          phone: staffInfo.phone,
          position: staffInfo.position,
          notes: staffInfo.notes,
          hire_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) // Random date within last year
        }
      })

      createdStaff.push(staffUser)
      console.log(`Created staff: ${staffInfo.full_name} (${staffInfo.email}) - ${staffInfo.position}`)

      // Assign some residents to staff (if available)
      if (
        residents.length > 0 &&
        (staffInfo.position === StaffPosition.NURSE ||
          staffInfo.position === StaffPosition.CAREGIVER ||
          staffInfo.position === StaffPosition.PHYSICIAN)
      ) {
        const numResidentsToAssign = Math.min(3, Math.floor(Math.random() * 4) + 1) // 1-3 residents
        const residentsToAssign = residents
          .filter((r) => !r.assigned_staff_id) // Only assign to residents without staff
          .slice(0, numResidentsToAssign)

        for (const resident of residentsToAssign) {
          await prisma.resident.update({
            where: { resident_id: resident.resident_id },
            data: {
              assigned_staff_id: staffUser.user_id
            }
          })
        }
        if (residentsToAssign.length > 0) {
          console.log(`  Assigned ${residentsToAssign.length} residents to ${staffInfo.full_name}`)
        }
      }
    }

    console.log(`Created ${createdStaff.length} staff users`)
  } else {
    console.log('No institution found, skipping staff seeding')
  }

  // 6. Seed Residents with full data
  const allInstitutionsForResidents =
    createdInstitutions.length > 0 ? createdInstitutions : await prisma.institution.findMany()
  const allStaff = await prisma.user.findMany({
    where: { role: UserRole.Staff },
    include: { staffProfile: true }
  })
  const allRooms = await prisma.room.findMany()

  if (allInstitutionsForResidents.length > 0 && allRooms.length > 0) {
    console.log('Seeding residents...')
    const institution = allInstitutionsForResidents[0]
    const availableRooms = allRooms.filter((r) => r.institution_id === institution.institution_id && r.is_available)

    const residentsData = [
      {
        full_name: 'Nguyễn Văn An',
        gender: Gender.male,
        date_of_birth: new Date(1945, 2, 15),
        height_cm: 165,
        weight_kg: 68,
        bmi: 25.0,
        admission_date: new Date(2023, 0, 10),
        roomIndex: 0,
        staffIndex: 0,
        chronicDiseases: [
          { name: 'Tăng huyết áp', severity: DiseaseSeverity.MODERATE, status: DiseaseStatus.ACTIVE },
          { name: 'Đái tháo đường type 2', severity: DiseaseSeverity.MILD, status: DiseaseStatus.ACTIVE }
        ],
        allergies: [
          { substance: 'Đậu phộng', severity: AllergySeverity.SEVERE, reaction: 'Phát ban, khó thở' },
          { substance: 'Hải sản', severity: AllergySeverity.MODERATE, reaction: 'Ngứa, nổi mề đay' }
        ]
      },
      {
        full_name: 'Trần Thị Bình',
        gender: Gender.female,
        date_of_birth: new Date(1948, 5, 20),
        height_cm: 155,
        weight_kg: 58,
        bmi: 24.1,
        admission_date: new Date(2023, 1, 15),
        roomIndex: 1,
        staffIndex: 1,
        chronicDiseases: [
          { name: 'Viêm khớp', severity: DiseaseSeverity.MODERATE, status: DiseaseStatus.ACTIVE },
          { name: 'Loãng xương', severity: DiseaseSeverity.MILD, status: DiseaseStatus.ACTIVE }
        ],
        allergies: [{ substance: 'Sữa', severity: AllergySeverity.MODERATE, reaction: 'Đau bụng, tiêu chảy' }]
      },
      {
        full_name: 'Lê Văn Cường',
        gender: Gender.male,
        date_of_birth: new Date(1942, 8, 10),
        height_cm: 170,
        weight_kg: 72,
        bmi: 24.9,
        admission_date: new Date(2022, 11, 5),
        roomIndex: 2,
        staffIndex: 2,
        chronicDiseases: [
          { name: 'Bệnh tim mạch', severity: DiseaseSeverity.SEVERE, status: DiseaseStatus.ACTIVE },
          { name: 'Suy tim', severity: DiseaseSeverity.MODERATE, status: DiseaseStatus.ACTIVE }
        ],
        allergies: []
      },
      {
        full_name: 'Phạm Thị Dung',
        gender: Gender.female,
        date_of_birth: new Date(1950, 0, 25),
        height_cm: 160,
        weight_kg: 62,
        bmi: 24.2,
        admission_date: new Date(2023, 2, 1),
        roomIndex: 0,
        staffIndex: 0,
        chronicDiseases: [
          { name: 'Đái tháo đường type 2', severity: DiseaseSeverity.MODERATE, status: DiseaseStatus.ACTIVE }
        ],
        allergies: [{ substance: 'Gluten', severity: AllergySeverity.MILD, reaction: 'Đầy hơi' }]
      },
      {
        full_name: 'Hoàng Văn Em',
        gender: Gender.male,
        date_of_birth: new Date(1947, 3, 12),
        height_cm: 168,
        weight_kg: 70,
        bmi: 24.8,
        admission_date: new Date(2023, 0, 20),
        roomIndex: 1,
        staffIndex: 1,
        chronicDiseases: [
          { name: 'Bệnh phổi tắc nghẽn mạn tính', severity: DiseaseSeverity.MODERATE, status: DiseaseStatus.ACTIVE }
        ],
        allergies: []
      },
      {
        full_name: 'Vũ Thị Phương',
        gender: Gender.female,
        date_of_birth: new Date(1949, 6, 8),
        height_cm: 158,
        weight_kg: 60,
        bmi: 24.0,
        admission_date: new Date(2023, 1, 10),
        roomIndex: 2,
        staffIndex: 2,
        chronicDiseases: [
          { name: 'Tăng huyết áp', severity: DiseaseSeverity.MILD, status: DiseaseStatus.ACTIVE },
          { name: 'Viêm khớp', severity: DiseaseSeverity.MILD, status: DiseaseStatus.ACTIVE }
        ],
        allergies: [{ substance: 'Trứng', severity: AllergySeverity.MILD, reaction: 'Ngứa nhẹ' }]
      },
      {
        full_name: 'Đặng Văn Giang',
        gender: Gender.male,
        date_of_birth: new Date(1944, 9, 30),
        height_cm: 172,
        weight_kg: 75,
        bmi: 25.3,
        admission_date: new Date(2022, 10, 15),
        roomIndex: 0,
        staffIndex: 0,
        chronicDiseases: [
          { name: 'Đột quỵ (đã phục hồi)', severity: DiseaseSeverity.MODERATE, status: DiseaseStatus.ACTIVE }
        ],
        allergies: []
      },
      {
        full_name: 'Bùi Thị Hoa',
        gender: Gender.female,
        date_of_birth: new Date(1946, 11, 5),
        height_cm: 162,
        weight_kg: 65,
        bmi: 24.8,
        admission_date: new Date(2023, 0, 5),
        roomIndex: 1,
        staffIndex: 1,
        chronicDiseases: [{ name: 'Suy thận mạn', severity: DiseaseSeverity.MODERATE, status: DiseaseStatus.ACTIVE }],
        allergies: [{ substance: 'Penicillin', severity: AllergySeverity.SEVERE, reaction: 'Sốc phản vệ' }]
      },
      {
        full_name: 'Nguyễn Văn Ích',
        gender: Gender.male,
        date_of_birth: new Date(1943, 4, 18),
        height_cm: 166,
        weight_kg: 69,
        bmi: 25.1,
        admission_date: new Date(2022, 11, 20),
        roomIndex: 2,
        staffIndex: 2,
        chronicDiseases: [{ name: 'Parkinson', severity: DiseaseSeverity.MODERATE, status: DiseaseStatus.ACTIVE }],
        allergies: []
      },
      {
        full_name: 'Trần Thị Kim',
        gender: Gender.female,
        date_of_birth: new Date(1945, 7, 22),
        height_cm: 159,
        weight_kg: 61,
        bmi: 24.1,
        admission_date: new Date(2023, 1, 25),
        roomIndex: 0,
        staffIndex: 0,
        chronicDiseases: [{ name: 'Alzheimer', severity: DiseaseSeverity.MODERATE, status: DiseaseStatus.ACTIVE }],
        allergies: []
      }
    ]

    const createdResidents: any[] = []
    for (const residentData of residentsData) {
      const room = availableRooms[residentData.roomIndex % availableRooms.length]
      const staff = allStaff[residentData.staffIndex % allStaff.length]

      const resident = await prisma.resident.create({
        data: {
          institution_id: institution.institution_id,
          room_id: room.room_id,
          full_name: residentData.full_name,
          gender: residentData.gender,
          date_of_birth: residentData.date_of_birth,
          height_cm: residentData.height_cm,
          weight_kg: residentData.weight_kg,
          bmi: residentData.bmi,
          admission_date: residentData.admission_date,
          assigned_staff_id: staff.user_id,
          notes: `Cư dân ${residentData.full_name}, nhập viện ngày ${residentData.admission_date.toLocaleDateString('vi-VN')}`,
          chronicDiseases: {
            create: residentData.chronicDiseases.map((d) => ({
              name: d.name,
              severity: d.severity,
              status: d.status,
              diagnosed_at: new Date(
                residentData.admission_date.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 5
              )
            }))
          },
          allergies: {
            create: residentData.allergies.map((a) => ({
              substance: a.substance,
              severity: a.severity,
              reaction: a.reaction
            }))
          }
        }
      })

      // Update room occupancy
      const updatedRoom = await prisma.room.findUnique({
        where: { room_id: room.room_id }
      })
      if (updatedRoom) {
        await prisma.room.update({
          where: { room_id: room.room_id },
          data: {
            current_occupancy: updatedRoom.current_occupancy + 1,
            is_available: updatedRoom.current_occupancy + 1 < updatedRoom.capacity
          }
        })
      }

      createdResidents.push(resident)
      console.log(`Created resident: ${residentData.full_name}`)
    }

    console.log(`Created ${createdResidents.length} residents`)

    // 7. Seed Rooms if not enough
    if (availableRooms.length < 10) {
      console.log('Seeding additional rooms...')
      const roomTypes = [RoomType.single, RoomType.double, RoomType.multi]
      for (let i = availableRooms.length; i < 15; i++) {
        const roomType = roomTypes[i % 3]
        const capacity = roomType === RoomType.single ? 1 : roomType === RoomType.double ? 2 : 4

        await prisma.room.create({
          data: {
            institution_id: institution.institution_id,
            room_number: `P${String(i + 1).padStart(3, '0')}`,
            type: roomType,
            capacity,
            is_available: true,
            current_occupancy: 0,
            notes: `Phòng ${roomType}, sức chứa ${capacity} người`
          }
        })
      }
      console.log('Created additional rooms')
    }

    // 8. Seed Posts with images
    console.log('Seeding posts...')
    const imageUrl = 'http://localhost:3000/api/media/static/images/ehwjmgcc0k0bv7h5f9bxbx35v.jpg'
    const staffAuthors = allStaff.slice(0, 5)

    const postsData = [
      {
        title: 'Hoạt động thể dục buổi sáng',
        content:
          'Các cư dân đã tham gia buổi tập thể dục buổi sáng với nhiều động tác nhẹ nhàng, phù hợp với sức khỏe. Mọi người đều rất tích cực và vui vẻ!',
        image_urls: [imageUrl],
        tags: ['thể dục', 'sức khỏe', 'hoạt động'],
        visibility: PostVisibility.STAFF_AND_FAMILY_OF_RESIDENTS,
        residentIds: [0, 1, 2]
      },
      {
        title: 'Bữa trưa đầy dinh dưỡng',
        content:
          'Hôm nay chúng tôi phục vụ bữa trưa với thực đơn đa dạng, đảm bảo đầy đủ chất dinh dưỡng cho các cư dân. Món ăn được chế biến cẩn thận, phù hợp với từng chế độ ăn đặc biệt.',
        image_urls: [imageUrl],
        tags: ['dinh dưỡng', 'bữa ăn'],
        visibility: PostVisibility.PUBLIC,
        residentIds: [0, 1, 2, 3, 4]
      },
      {
        title: 'Buổi trị liệu vật lý',
        content:
          'Các cư dân đang trong quá trình phục hồi chức năng đã tham gia buổi trị liệu vật lý. Các bài tập được thiết kế phù hợp với tình trạng sức khỏe của từng người.',
        image_urls: [imageUrl],
        tags: ['trị liệu', 'phục hồi'],
        visibility: PostVisibility.STAFF_AND_FAMILY_OF_RESIDENTS,
        residentIds: [2, 6]
      },
      {
        title: 'Sinh nhật cư dân',
        content:
          'Chúng tôi đã tổ chức một buổi tiệc sinh nhật ấm cúng cho cư dân. Mọi người cùng nhau hát chúc mừng và thưởng thức bánh kem. Không khí rất vui vẻ và đầy tình cảm!',
        image_urls: [imageUrl],
        tags: ['sinh nhật', 'kỷ niệm'],
        visibility: PostVisibility.PUBLIC,
        residentIds: [3]
      },
      {
        title: 'Hoạt động giải trí buổi chiều',
        content:
          'Các cư dân tham gia các hoạt động giải trí như đọc sách, chơi cờ, và trò chuyện. Đây là những hoạt động giúp kích thích trí não và tạo không khí thân thiện.',
        image_urls: [imageUrl],
        tags: ['giải trí', 'tinh thần'],
        visibility: PostVisibility.STAFF_AND_FAMILY_OF_RESIDENTS,
        residentIds: [0, 1, 2, 3, 4, 5]
      },
      {
        title: 'Kiểm tra sức khỏe định kỳ',
        content:
          'Bác sĩ đã tiến hành kiểm tra sức khỏe định kỳ cho các cư dân. Tất cả đều có sức khỏe ổn định, các chỉ số đều trong mức bình thường.',
        image_urls: [imageUrl],
        tags: ['sức khỏe', 'kiểm tra'],
        visibility: PostVisibility.STAFF_AND_FAMILY_OF_RESIDENTS,
        residentIds: [0, 1, 2, 3, 4]
      },
      {
        title: 'Buổi họp mặt gia đình',
        content:
          'Các gia đình đã đến thăm và cùng các cư dân tham gia buổi họp mặt. Không khí gia đình ấm áp, mọi người cùng nhau chia sẻ những câu chuyện vui.',
        image_urls: [imageUrl],
        tags: ['gia đình', 'thăm viếng'],
        visibility: PostVisibility.PUBLIC,
        residentIds: [0, 1, 2]
      },
      {
        title: 'Lớp học nấu ăn',
        content:
          'Các cư dân tham gia lớp học nấu ăn đơn giản. Đây là hoạt động giúp họ duy trì kỹ năng và tạo niềm vui trong cuộc sống hàng ngày.',
        image_urls: [imageUrl],
        tags: ['học tập', 'kỹ năng'],
        visibility: PostVisibility.STAFF_AND_FAMILY_OF_RESIDENTS,
        residentIds: [1, 3, 5]
      },
      {
        title: 'Buổi dạo mát trong vườn',
        content:
          'Các cư dân được đưa đi dạo mát trong khu vườn của viện. Không khí trong lành và cảnh quan xanh tươi giúp tinh thần thoải mái hơn.',
        image_urls: [imageUrl],
        tags: ['thiên nhiên', 'thư giãn'],
        visibility: PostVisibility.PUBLIC,
        residentIds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      },
      {
        title: 'Chương trình văn nghệ',
        content:
          'Buổi biểu diễn văn nghệ với các tiết mục ca hát, múa do chính các cư dân và nhân viên thực hiện. Khán giả rất hào hứng và cổ vũ nhiệt tình!',
        image_urls: [imageUrl],
        tags: ['văn nghệ', 'giải trí'],
        visibility: PostVisibility.PUBLIC,
        residentIds: [0, 1, 2, 3, 4, 5]
      }
    ]

    const createdPosts: any[] = []
    for (let i = 0; i < postsData.length; i++) {
      const postData = postsData[i]
      const author = staffAuthors[i % staffAuthors.length]
      const postResidents = postData.residentIds.map((idx) => createdResidents[idx % createdResidents.length])

      const post = await prisma.post.create({
        data: {
          institution_id: institution.institution_id,
          author_id: author.user_id,
          title: postData.title,
          content: postData.content,
          image_urls: postData.image_urls,
          tags: postData.tags,
          visibility: postData.visibility,
          likes_count: Math.floor(Math.random() * 20),
          postResidents: {
            create: postResidents.map((r) => ({
              resident_id: r.resident_id
            }))
          }
        }
      })

      createdPosts.push(post)
      console.log(`Created post: ${postData.title}`)
    }

    console.log(`Created ${createdPosts.length} posts`)

    // 9. Seed Comments and Likes for posts
    console.log('Seeding comments and likes...')
    for (const post of createdPosts) {
      // Add some likes
      const likers = allStaff.slice(0, Math.floor(Math.random() * 5) + 2)
      for (const liker of likers) {
        try {
          await prisma.postLike.create({
            data: {
              post_id: post.post_id,
              user_id: liker.user_id
            }
          })
        } catch {
          // Skip if already liked
        }
      }

      // Add some comments
      const commenters = allStaff.slice(0, Math.floor(Math.random() * 3) + 1)
      const comments = [
        'Hoạt động rất bổ ích!',
        'Cảm ơn nhân viên đã chăm sóc tận tình.',
        'Rất vui khi thấy các cư dân hạnh phúc.',
        'Chúc mừng sinh nhật!',
        'Hoạt động này thật tuyệt vời!'
      ]

      for (const commenter of commenters) {
        await prisma.comment.create({
          data: {
            post_id: post.post_id,
            user_id: commenter.user_id,
            content: comments[Math.floor(Math.random() * comments.length)]
          }
        })
      }
    }
    console.log('Created comments and likes')

    // 10. Seed Health Assessments
    console.log('Seeding health assessments...')
    for (const resident of createdResidents) {
      const assessments: any[] = []
      // Create assessments for last 30 days
      for (let i = 0; i < 10; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i * 3)
        const staff = allStaff[Math.floor(Math.random() * allStaff.length)]

        assessments.push({
          resident_id: resident.resident_id,
          assessed_by_id: staff.user_id,
          cognitive_status: [CognitiveStatus.NORMAL, CognitiveStatus.IMPAIRED, CognitiveStatus.SEVERE][
            Math.floor(Math.random() * 3)
          ],
          mobility_status: [MobilityStatus.INDEPENDENT, MobilityStatus.ASSISTED, MobilityStatus.DEPENDENT][
            Math.floor(Math.random() * 3)
          ],
          weight_kg: resident.weight_kg! + (Math.random() * 2 - 1),
          height_cm: resident.height_cm,
          bmi: resident.bmi! + (Math.random() * 0.5 - 0.25),
          temperature_c: 36.5 + (Math.random() * 0.8 - 0.4),
          blood_pressure_systolic: 110 + Math.floor(Math.random() * 30),
          blood_pressure_diastolic: 70 + Math.floor(Math.random() * 15),
          heart_rate: 60 + Math.floor(Math.random() * 30),
          respiratory_rate: 14 + Math.floor(Math.random() * 6),
          oxygen_saturation: 95 + Math.floor(Math.random() * 5),
          measured_at: date,
          measurement_shift: ['Sáng', 'Chiều', 'Tối'][Math.floor(Math.random() * 3)],
          notes: `Kiểm tra sức khỏe định kỳ ngày ${date.toLocaleDateString('vi-VN')}`
        })
      }

      await prisma.healthAssessment.createMany({
        data: assessments
      })
    }
    console.log('Created health assessments')

    // 11. Seed Activities
    console.log('Seeding activities...')
    const activitiesData = [
      { name: 'Thể dục buổi sáng', type: ActivityType.physical_exercise, duration_minutes: 30, max_participants: 20 },
      { name: 'Trị liệu vật lý', type: ActivityType.therapy, duration_minutes: 45, max_participants: 5 },
      { name: 'Đọc sách', type: ActivityType.mental_activity, duration_minutes: 60, max_participants: 15 },
      { name: 'Chơi cờ', type: ActivityType.social_interaction, duration_minutes: 60, max_participants: 10 },
      { name: 'Ca hát tập thể', type: ActivityType.entertainment, duration_minutes: 45, max_participants: 25 },
      { name: 'Yoga nhẹ', type: ActivityType.physical_exercise, duration_minutes: 30, max_participants: 12 },
      { name: 'Lớp học nấu ăn', type: ActivityType.education, duration_minutes: 90, max_participants: 8 },
      { name: 'Thiền định', type: ActivityType.mental_activity, duration_minutes: 20, max_participants: 15 },
      { name: 'Dạo mát trong vườn', type: ActivityType.physical_exercise, duration_minutes: 30, max_participants: 20 },
      { name: 'Xem phim', type: ActivityType.entertainment, duration_minutes: 120, max_participants: 30 }
    ]

    const createdActivities: any[] = []
    for (const activityData of activitiesData) {
      const activity = await prisma.activity.create({
        data: {
          institution_id: institution.institution_id,
          name: activityData.name,
          description: `Hoạt động ${activityData.name.toLowerCase()} dành cho cư dân`,
          type: activityData.type,
          duration_minutes: activityData.duration_minutes,
          max_participants: activityData.max_participants,
          is_active: true
        }
      })
      createdActivities.push(activity)
    }
    console.log(`Created ${createdActivities.length} activities`)

    // 12. Seed Schedules
    console.log('Seeding schedules...')
    const schedules: any[] = []
    const today = new Date()
    for (let day = 0; day < 14; day++) {
      const date = new Date(today)
      date.setDate(date.getDate() + day)

      // Morning activities
      for (let i = 0; i < 3; i++) {
        const activity = createdActivities[Math.floor(Math.random() * createdActivities.length)]
        const resident = createdResidents[Math.floor(Math.random() * createdResidents.length)]
        const staff = allStaff[Math.floor(Math.random() * allStaff.length)]

        const startTime = new Date(date)
        startTime.setHours(8 + i * 2, 0, 0, 0)
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + activity.duration_minutes)

        schedules.push({
          activity_id: activity.activity_id,
          institution_id: institution.institution_id,
          resident_id: resident.resident_id,
          staff_id: staff.user_id,
          title: activity.name,
          description: `Lịch ${activity.name} cho ${resident.full_name}`,
          start_time: startTime,
          end_time: endTime,
          frequency: ScheduleFrequency.one_time,
          is_recurring: false,
          status:
            day < 2
              ? ActivityStatus.planned
              : Math.random() > 0.5
                ? ActivityStatus.participated
                : ActivityStatus.planned,
          notes: `Hoạt động được lên lịch cho ngày ${date.toLocaleDateString('vi-VN')}`
        })
      }
    }

    await prisma.schedule.createMany({
      data: schedules
    })
    console.log(`Created ${schedules.length} schedules`)

    // 13. Seed CareLogs
    console.log('Seeding care logs...')
    const careLogs: any[] = []
    for (let day = 0; day < 7; day++) {
      const date = new Date(today)
      date.setDate(date.getDate() - day)

      for (const resident of createdResidents) {
        const staff = allStaff[Math.floor(Math.random() * allStaff.length)]
        const careTypes = [CareLogType.meal, CareLogType.medication, CareLogType.hygiene, CareLogType.exercise]

        for (const careType of careTypes) {
          const startTime = new Date(date)
          startTime.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0)
          const endTime = new Date(startTime)
          endTime.setMinutes(endTime.getMinutes() + 15 + Math.floor(Math.random() * 30))

          const titles = {
            [CareLogType.meal]: 'Bữa ăn',
            [CareLogType.medication]: 'Uống thuốc',
            [CareLogType.hygiene]: 'Vệ sinh cá nhân',
            [CareLogType.exercise]: 'Tập thể dục',
            [CareLogType.custom]: 'Chăm sóc đặc biệt'
          }

          careLogs.push({
            resident_id: resident.resident_id,
            staff_id: staff.user_id,
            institution_id: institution.institution_id,
            type: careType,
            title: titles[careType],
            description: `Ghi chép ${titles[careType].toLowerCase()} cho ${resident.full_name}`,
            start_time: startTime,
            end_time: endTime,
            notes: `Hoàn thành tốt, tình trạng sức khỏe ổn định`
          })
        }
      }
    }

    await prisma.careLog.createMany({
      data: careLogs
    })
    console.log(`Created ${careLogs.length} care logs`)

    // 14. Seed Medications
    console.log('Seeding medications...')
    const medicationsData = [
      {
        name: 'Lisinopril',
        dosage: '10mg',
        form: MedicationForm.tablet,
        frequency: 'Một lần mỗi ngày',
        timing: MedicationTiming.before_meal
      },
      {
        name: 'Metformin',
        dosage: '500mg',
        form: MedicationForm.tablet,
        frequency: 'Hai lần mỗi ngày',
        timing: MedicationTiming.with_meal
      },
      {
        name: 'Aspirin',
        dosage: '100mg',
        form: MedicationForm.tablet,
        frequency: 'Một lần mỗi ngày',
        timing: MedicationTiming.after_meal
      },
      {
        name: 'Calcium',
        dosage: '1000mg',
        form: MedicationForm.tablet,
        frequency: 'Một lần mỗi ngày',
        timing: MedicationTiming.any_time
      },
      {
        name: 'Vitamin D',
        dosage: '1000 IU',
        form: MedicationForm.capsule,
        frequency: 'Một lần mỗi ngày',
        timing: MedicationTiming.any_time
      },
      {
        name: 'Omeprazole',
        dosage: '20mg',
        form: MedicationForm.capsule,
        frequency: 'Một lần mỗi ngày',
        timing: MedicationTiming.before_meal
      },
      {
        name: 'Atorvastatin',
        dosage: '20mg',
        form: MedicationForm.tablet,
        frequency: 'Một lần mỗi ngày',
        timing: MedicationTiming.after_meal
      },
      {
        name: 'Amlodipine',
        dosage: '5mg',
        form: MedicationForm.tablet,
        frequency: 'Một lần mỗi ngày',
        timing: MedicationTiming.any_time
      }
    ]

    const createdMedications: any[] = []
    for (const medData of medicationsData) {
      const medication = await prisma.medication.create({
        data: {
          institution_id: institution.institution_id,
          name: medData.name,
          dosage: medData.dosage,
          form: medData.form,
          frequency: medData.frequency,
          timing: medData.timing,
          instructions: `Uống đúng liều lượng theo chỉ định của bác sĩ`,
          is_active: true
        }
      })
      createdMedications.push(medication)
    }
    console.log(`Created ${createdMedications.length} medications`)

    // 15. Seed Medication Care Plan Assignments
    console.log('Seeding medication care plans...')
    const allRoomsForInstitution = await prisma.room.findMany({
      where: { institution_id: institution.institution_id }
    })

    for (const medication of createdMedications.slice(0, 5)) {
      const residentIds = createdResidents.slice(0, Math.floor(Math.random() * 5) + 2).map((r) => r.resident_id)
      const roomIds = allRoomsForInstitution.slice(0, Math.floor(Math.random() * 3) + 1).map((r) => r.room_id)
      const staffIds = allStaff.slice(0, Math.floor(Math.random() * 3) + 1).map((s) => s.user_id)

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)

      await prisma.medicationCarePlanAssignment.create({
        data: {
          medication_id: medication.medication_id,
          institution_id: institution.institution_id,
          resident_ids: residentIds,
          room_ids: roomIds,
          staff_ids: staffIds,
          start_date: startDate,
          end_date: endDate,
          time_slot: [TimeSlot.morning, TimeSlot.noon, TimeSlot.afternoon, TimeSlot.evening][
            Math.floor(Math.random() * 4)
          ],
          is_active: true,
          notes: `Kế hoạch dùng thuốc ${medication.name} cho các cư dân được chỉ định`
        }
      })
    }
    console.log('Created medication care plans')

    // 16. Seed Family Resident Links
    console.log('Seeding family resident links...')
    const familyUsers = await prisma.user.findMany({
      where: { role: UserRole.Family },
      take: 5
    })

    if (familyUsers.length > 0) {
      for (let i = 0; i < Math.min(familyUsers.length, createdResidents.length); i++) {
        const familyUser = familyUsers[i]
        const resident = createdResidents[i]

        await prisma.familyResidentLink.create({
          data: {
            family_user_id: familyUser.user_id,
            family_email: familyUser.email,
            resident_id: resident.resident_id,
            institution_id: institution.institution_id,
            status: FamilyLinkStatus.active
          }
        })
      }
      console.log('Created family resident links')
    }

    // 17. Seed Visits
    console.log('Seeding visits...')
    if (familyUsers.length > 0) {
      const visits: any[] = []
      const usedCombinations = new Set<string>() // Track used (family_user_id, visit_date, time_block) combinations

      for (let day = 0; day < 14; day++) {
        const visitDate = new Date(today)
        visitDate.setDate(visitDate.getDate() + day)
        visitDate.setHours(0, 0, 0, 0) // Normalize to start of day

        const timeBlocks = [VisitTimeBlock.morning, VisitTimeBlock.afternoon, VisitTimeBlock.evening]

        // Shuffle family users and residents for variety
        const shuffledFamilyUsers = [...familyUsers].sort(() => Math.random() - 0.5)
        const shuffledResidents = [...createdResidents].sort(() => Math.random() - 0.5)

        let visitCount = 0
        for (const familyUser of shuffledFamilyUsers) {
          if (visitCount >= 3) break // Max 3 visits per day

          for (const timeBlock of timeBlocks) {
            if (visitCount >= 3) break

            // Create unique key for combination
            const dateStr = visitDate.toISOString().split('T')[0] // YYYY-MM-DD format
            const combinationKey = `${familyUser.user_id}_${dateStr}_${timeBlock}`

            if (usedCombinations.has(combinationKey)) {
              continue // Skip if this combination already exists
            }

            const resident = shuffledResidents[Math.floor(Math.random() * shuffledResidents.length)]

            visits.push({
              family_user_id: familyUser.user_id,
              resident_id: resident.resident_id,
              institution_id: institution.institution_id,
              visit_date: visitDate,
              time_block: timeBlock,
              duration: 60,
              purpose: ['Thăm hỏi', 'Mang đồ dùng', 'Trò chuyện', 'Chăm sóc'][Math.floor(Math.random() * 4)],
              status: day < 3 ? VisitStatus.approved : day < 7 ? VisitStatus.pending : VisitStatus.scheduled,
              notes: `Lịch thăm viếng cho ${resident.full_name}`
            })

            usedCombinations.add(combinationKey)
            visitCount++
          }
        }
      }

      // Create visits one by one to handle potential duplicates gracefully
      let createdCount = 0
      for (const visit of visits) {
        try {
          await prisma.visit.create({
            data: visit
          })
          createdCount++
        } catch (error: any) {
          if (error.code === 'P2002') {
            // Unique constraint violation - skip this visit
            console.log(`Skipping duplicate visit: ${visit.family_user_id} on ${visit.visit_date}`)
            continue
          }
          throw error
        }
      }
      console.log(`Created ${createdCount} visits`)
    }

    // 18. Seed Feedback data
    console.log('Seeding feedbacks...')
    if (familyUsers.length > 0 && createdResidents.length > 0) {
      // Get feedback categories
      const feedbackCategories = await prisma.feedbackCategory.findMany({
        where: { institution_id: institution.institution_id, is_active: true }
      })

      if (feedbackCategories.length > 0) {
        const feedbacksData = [
          {
            familyUserIndex: 0,
            residentIndex: 0,
            categoryIndex: 0,
            type: 'Service Quality',
            message:
              'Xin chào, tôi muốn phản ánh về chất lượng dịch vụ. Nhân viên chăm sóc rất tận tâm nhưng đôi khi phản hồi hơi chậm. Mong được cải thiện.',
            status: FeedbackStatus.pending,
            attachments: []
          },
          {
            familyUserIndex: 1,
            residentIndex: 1,
            categoryIndex: 1,
            type: 'Process Improvement',
            message:
              'Tôi có đề xuất về việc cải thiện quy trình thăm viếng. Nên có thêm khung giờ linh hoạt hơn cho gia đình.',
            status: FeedbackStatus.in_progress,
            attachments: []
          },
          {
            familyUserIndex: 0,
            residentIndex: 2,
            categoryIndex: 2,
            type: 'Medical Request',
            message: 'Yêu cầu kiểm tra sức khỏe định kỳ cho cư dân. Cần lên lịch khám tổng quát trong tuần tới.',
            status: FeedbackStatus.pending,
            attachments: []
          },
          {
            familyUserIndex: 1,
            residentIndex: 3,
            categoryIndex: 0,
            type: 'Facility Issues',
            message: 'Phòng của cư dân có vấn đề về hệ thống điều hòa. Mong được sửa chữa sớm.',
            status: FeedbackStatus.resolved,
            attachments: [],
            staffNotes: 'Đã sửa chữa điều hòa vào ngày 15/12/2024. Cư dân hài lòng.',
            assignedStaffIndex: 0
          },
          {
            familyUserIndex: 0,
            residentIndex: 4,
            categoryIndex: 3,
            type: 'Information Request',
            message: 'Xin thông tin về chế độ ăn uống hiện tại của cư dân. Cần biết thực đơn hàng tuần.',
            status: FeedbackStatus.resolved,
            attachments: [],
            staffNotes: 'Đã gửi thực đơn qua email. Gia đình đã xác nhận nhận được.',
            assignedStaffIndex: 1
          },
          {
            familyUserIndex: 1,
            residentIndex: 5,
            categoryIndex: 2,
            type: 'Dietary Request',
            message: 'Yêu cầu điều chỉnh chế độ ăn cho cư dân. Cần giảm muối và đường do bệnh tiểu đường.',
            status: FeedbackStatus.in_progress,
            attachments: [],
            staffNotes: 'Đang phối hợp với chuyên viên dinh dưỡng để điều chỉnh thực đơn.',
            assignedStaffIndex: 2
          },
          {
            familyUserIndex: 0,
            residentIndex: 6,
            categoryIndex: 0,
            type: 'Staff Behavior',
            message: 'Cảm ơn nhân viên đã chăm sóc tận tình. Đặc biệt là y tá Nguyễn Văn An rất chu đáo.',
            status: FeedbackStatus.resolved,
            attachments: [],
            staffNotes: 'Đã chuyển lời cảm ơn đến nhân viên. Rất vui khi nhận được phản hồi tích cực.',
            assignedStaffIndex: 0
          },
          {
            familyUserIndex: 1,
            residentIndex: 7,
            categoryIndex: 1,
            type: 'Service Enhancement',
            message: 'Đề xuất tổ chức thêm các hoạt động giải trí vào cuối tuần. Cư dân rất thích các hoạt động nhóm.',
            status: FeedbackStatus.pending,
            attachments: []
          },
          {
            familyUserIndex: 0,
            residentIndex: 8,
            categoryIndex: 2,
            type: 'Activity Request',
            message: 'Yêu cầu tăng cường các buổi trị liệu vật lý cho cư dân. Hiện tại chỉ có 2 buổi/tuần.',
            status: FeedbackStatus.in_progress,
            attachments: [],
            staffNotes: 'Đang sắp xếp thêm lịch trị liệu. Sẽ tăng lên 3 buổi/tuần từ tuần sau.',
            assignedStaffIndex: 2
          },
          {
            familyUserIndex: 1,
            residentIndex: 9,
            categoryIndex: 3,
            type: 'Status Inquiry',
            message: 'Xin hỏi về tình trạng sức khỏe hiện tại của cư dân. Có cần lưu ý gì đặc biệt không?',
            status: FeedbackStatus.resolved,
            attachments: [],
            staffNotes: 'Đã cập nhật tình trạng sức khỏe. Cư dân ổn định, các chỉ số bình thường.',
            assignedStaffIndex: 0
          },
          {
            familyUserIndex: 0,
            residentIndex: 0,
            categoryIndex: 0,
            type: 'Other',
            message: 'Phản ánh về tiếng ồn vào buổi tối. Mong được xử lý để cư dân nghỉ ngơi tốt hơn.',
            status: FeedbackStatus.pending,
            attachments: []
          },
          {
            familyUserIndex: 1,
            residentIndex: 1,
            categoryIndex: 1,
            type: 'Facility Upgrade',
            message: 'Đề xuất nâng cấp khu vực vườn. Nên thêm nhiều cây xanh và ghế ngồi để cư dân thư giãn.',
            status: FeedbackStatus.pending,
            attachments: []
          },
          {
            familyUserIndex: 0,
            residentIndex: 2,
            categoryIndex: 2,
            type: 'Medical Request',
            message: 'Yêu cầu tái khám với bác sĩ chuyên khoa tim mạch. Cư dân cần kiểm tra định kỳ.',
            status: FeedbackStatus.in_progress,
            attachments: [],
            staffNotes: 'Đã đặt lịch khám với bác sĩ tim mạch vào tuần tới.',
            assignedStaffIndex: 0
          },
          {
            familyUserIndex: 1,
            residentIndex: 3,
            categoryIndex: 3,
            type: 'Policy Question',
            message: 'Xin hỏi về chính sách thăm viếng. Có thể thăm vào ngày lễ không?',
            status: FeedbackStatus.resolved,
            attachments: [],
            staffNotes: 'Đã giải thích chính sách thăm viếng. Có thể thăm vào ngày lễ nhưng cần đặt lịch trước.',
            assignedStaffIndex: 1
          },
          {
            familyUserIndex: 0,
            residentIndex: 4,
            categoryIndex: 0,
            type: 'Service Quality',
            message: 'Phản ánh về chất lượng bữa ăn. Món ăn đôi khi hơi nhạt, mong được cải thiện.',
            status: FeedbackStatus.pending,
            attachments: []
          },
          {
            familyUserIndex: 1,
            residentIndex: 5,
            categoryIndex: 1,
            type: 'Service Enhancement',
            message:
              'Đề xuất cải thiện hệ thống thông báo. Nên có thông báo tự động khi có thay đổi về sức khỏe của cư dân.',
            status: FeedbackStatus.pending,
            attachments: []
          }
        ]

        const createdFeedbacks: any[] = []
        for (const feedbackData of feedbacksData) {
          const familyUser = familyUsers[feedbackData.familyUserIndex % familyUsers.length]
          const resident = createdResidents[feedbackData.residentIndex % createdResidents.length]
          const category = feedbackCategories[feedbackData.categoryIndex % feedbackCategories.length]
          const assignedStaff =
            feedbackData.assignedStaffIndex !== undefined
              ? allStaff[feedbackData.assignedStaffIndex % allStaff.length]
              : null

          // Get types from category metadata
          const categoryTypes = (category.metadata as any)?.types || []
          const type = categoryTypes.includes(feedbackData.type) ? feedbackData.type : categoryTypes[0] || 'Other'

          const feedback = await prisma.feedback.create({
            data: {
              family_user_id: familyUser.user_id,
              resident_id: resident.resident_id,
              institution_id: institution.institution_id,
              category_id: category.category_id,
              type: type,
              message: feedbackData.message,
              attachments: feedbackData.attachments,
              status: feedbackData.status,
              staff_notes: feedbackData.staffNotes || null,
              assigned_staff_id: assignedStaff?.user_id || null,
              resolved_at: feedbackData.status === FeedbackStatus.resolved ? new Date() : null
            }
          })

          createdFeedbacks.push(feedback)
        }

        console.log(`Created ${createdFeedbacks.length} feedbacks`)
      } else {
        console.log('No feedback categories found, skipping feedback seeding')
      }
    }

    // 19. Seed Daily Schedule Events
    console.log('Seeding daily schedule events...')
    const allRoomsForEvents = await prisma.room.findMany({
      where: { institution_id: institution.institution_id },
      take: 5
    })

    const eventToday = new Date()
    eventToday.setHours(0, 0, 0, 0)

    const dailyEventsData = [
      {
        name: 'Kiểm tra dấu hiệu sinh tồn buổi sáng',
        type: EventType.Care,
        start_hour: 7,
        start_minute: 0,
        duration_minutes: 30,
        careSubType: CareSubType.VitalCheck,
        frequency: EventFrequency.Daily,
        roomIds: allRoomsForEvents.slice(0, 2).map((r) => r.room_id)
      },
      {
        name: 'Uống thuốc buổi sáng',
        type: EventType.Care,
        start_hour: 8,
        start_minute: 0,
        duration_minutes: 15,
        careSubType: CareSubType.MedicationAdmin,
        frequency: EventFrequency.Daily,
        roomIds: []
      },
      {
        name: 'Bữa sáng',
        type: EventType.Care,
        start_hour: 8,
        start_minute: 30,
        duration_minutes: 60,
        careSubType: CareSubType.Meal,
        frequency: EventFrequency.Daily,
        roomIds: []
      },
      {
        name: 'Thể dục buổi sáng',
        type: EventType.Care,
        start_hour: 9,
        start_minute: 30,
        duration_minutes: 45,
        careSubType: CareSubType.Therapy,
        frequency: EventFrequency.Daily,
        roomIds: []
      },
      {
        name: 'Uống thuốc buổi trưa',
        type: EventType.Care,
        start_hour: 12,
        start_minute: 0,
        duration_minutes: 15,
        careSubType: CareSubType.MedicationAdmin,
        frequency: EventFrequency.Daily,
        roomIds: []
      },
      {
        name: 'Bữa trưa',
        type: EventType.Care,
        start_hour: 12,
        start_minute: 30,
        duration_minutes: 60,
        careSubType: CareSubType.Meal,
        frequency: EventFrequency.Daily,
        roomIds: []
      },
      {
        name: 'Vệ sinh cá nhân buổi chiều',
        type: EventType.Care,
        start_hour: 14,
        start_minute: 0,
        duration_minutes: 30,
        careSubType: CareSubType.Hygiene,
        frequency: EventFrequency.Daily,
        roomIds: allRoomsForEvents.slice(0, 3).map((r) => r.room_id)
      },
      {
        name: 'Hoạt động giải trí buổi chiều',
        type: EventType.Entertainment,
        start_hour: 15,
        start_minute: 0,
        duration_minutes: 60,
        careSubType: null,
        frequency: EventFrequency.Daily,
        roomIds: []
      },
      {
        name: 'Uống thuốc buổi tối',
        type: EventType.Care,
        start_hour: 18,
        start_minute: 0,
        duration_minutes: 15,
        careSubType: CareSubType.MedicationAdmin,
        frequency: EventFrequency.Daily,
        roomIds: []
      },
      {
        name: 'Bữa tối',
        type: EventType.Care,
        start_hour: 18,
        start_minute: 30,
        duration_minutes: 60,
        careSubType: CareSubType.Meal,
        frequency: EventFrequency.Daily,
        roomIds: []
      },
      {
        name: 'Kiểm tra dấu hiệu sinh tồn buổi tối',
        type: EventType.Care,
        start_hour: 20,
        start_minute: 0,
        duration_minutes: 30,
        careSubType: CareSubType.VitalCheck,
        frequency: EventFrequency.Daily,
        roomIds: allRoomsForEvents.slice(0, 2).map((r) => r.room_id)
      }
    ]

    const createdEvents: any[] = []
    
    // Tạo events cho 7 ngày đầu tiên (từ hôm nay đến 6 ngày sau)
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const eventDate = new Date(eventToday)
      eventDate.setDate(eventDate.getDate() + dayOffset)

      for (const eventData of dailyEventsData) {
        const startTime = new Date(eventDate)
        startTime.setHours(eventData.start_hour, eventData.start_minute, 0, 0)

        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + eventData.duration_minutes)

        // Chỉ tạo event đầu tiên với frequency Daily, các ngày sau sẽ được auto-generate
        // Nhưng để có dữ liệu test ngay, tạo events cho 7 ngày đầu
        const event = await prisma.event.create({
          data: {
            institution_id: institution.institution_id,
            name: eventData.name,
            type: eventData.type,
            start_time: startTime,
            end_time: endTime,
            location: institution.name, // Default to institution name
            room_ids: eventData.roomIds,
            care_configuration:
              eventData.type === EventType.Care && eventData.careSubType
                ? ({
                    subType: eventData.careSubType,
                    frequency: dayOffset === 0 ? eventData.frequency : EventFrequency.OneTime // Chỉ event đầu có frequency Daily
                  } as any)
                : undefined,
            status: EventStatus.Upcoming
          }
        })

        createdEvents.push(event)
      }
    }

    console.log(`Created ${createdEvents.length} daily schedule events (${dailyEventsData.length} events x 7 days)`)

    console.log('✅ All seed data created successfully!')
  } else {
    console.log('No institution or rooms found, skipping comprehensive seeding')
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
