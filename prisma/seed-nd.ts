import {
  PrismaClient,
  UserRole,
  UserStatus,
  InstitutionContractStatus,
  RoomType,
  Gender,
  ResidentStatus,
  StaffPosition,
  CareLogType,
  CareTaskStatus,
  MedicationForm,
  MedicationTiming,
  DishTexture,
  IngredientUnit,
  MealSlot,
  FeedbackStatus,
  EventType,
  EventStatus,
  CareSubType,
  EventFrequency,
  BillingCycle,
  PaymentMethod,
  PaymentStatus,
  DietTagType,
  VisitTimeBlock,
  FamilyLinkStatus,
  SOSAlertType,
  SOSAlertSeverity,
  SOSAlertStatus
} from '@prisma/client'
import { hashPassword } from '../src/utils/hash' // Đảm bảo đường dẫn đúng

const prisma = new PrismaClient()

// --- UTILS: Helper để random dữ liệu ---
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const getRandomDatePast = (days: number) => new Date(Date.now() - getRandomInt(0, days) * 24 * 60 * 60 * 1000)
const getRandomDateFuture = (days: number) => new Date(Date.now() + getRandomInt(1, days) * 24 * 60 * 60 * 1000)

// Data mẫu tiếng Việt
const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ']
const middleNamesMale = ['Văn', 'Hữu', 'Đức', 'Thành', 'Công', 'Minh', 'Quốc', 'Thế']
const middleNamesFemale = ['Thị', 'Thanh', 'Thu', 'Ngọc', 'Mỹ', 'Kim', 'Lan', 'Hồng']
const firstNamesMale = ['Hùng', 'Cường', 'Dũng', 'Nam', 'Trung', 'Hiếu', 'Nghĩa', 'Quân', 'Tuấn', 'Tâm']
const firstNamesFemale = ['Hoa', 'Huệ', 'Lan', 'Mai', 'Cúc', 'Trúc', 'Quỳnh', 'Hương', 'Thảo', 'Ly']

const generateName = (gender: Gender) => {
  const last = getRandomElement(lastNames)
  const middle = gender === Gender.male ? getRandomElement(middleNamesMale) : getRandomElement(middleNamesFemale)
  const first = gender === Gender.male ? getRandomElement(firstNamesMale) : getRandomElement(firstNamesFemale)
  return `${last} ${middle} ${first}`
}

const DUMMY_IMAGE_URL = 'http://localhost:3000/api/media/static/images/ehwjmgcc0k0bv7h5f9bxbx35v.jpg'

async function main() {
  console.log('🌱 Starting ROBUST seeding process...')

  // --- 0. CLEANUP ---
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`
  const tables = tablenames.map(({ tablename }) => tablename).filter((name) => name !== '_prisma_migrations')

  try {
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`)
    }
    console.log('🧹 Database cleaned.')
  } catch (error) {
    console.log('⚠️ Cleanup warnings (safe to ignore if first run).')
  }

  const pwData = await hashPassword('Mk@01234567890')
  const passwordHash = pwData.password

  // --- 1. INSTITUTION & CONFIG ---
  const institution = await prisma.institution.create({
    data: {
      name: 'Viện Dưỡng Lão HeLiCare Premium',
      address: {
        province: 'Đà Nẵng',
        district: 'Sơn Trà',
        ward: 'An Hải Bắc',
        street: 'Trần Hưng Đạo',
        detail: 'Khu biệt thự ven sông Hàn'
      },
      contact_info: { phone: '0236.888.999', email: 'contact@helicare.vn', website: 'https://helicare.vn' },
      status: InstitutionContractStatus.active,
      visitConfiguration: {
        create: {
          max_visitors_per_day: 100,
          max_visitors_per_slot: 20,
          advance_booking_days: 14,
          cancellation_hours: 4
        }
      },
      visitTimeSlots: {
        createMany: {
          data: [
            { name: 'Sáng (08:30 - 11:00)', start_time: '08:30', end_time: '11:00' },
            { name: 'Chiều (14:30 - 17:00)', start_time: '14:30', end_time: '17:00' },
            { name: 'Tối (18:30 - 20:00)', start_time: '18:30', end_time: '20:00' }
          ]
        }
      },
      feedbackCategories: {
        createMany: {
          data: [
            { name: 'Dịch vụ Chăm sóc', description: 'Thái độ nhân viên, kỹ năng điều dưỡng' },
            { name: 'Dinh dưỡng & Bữa ăn', description: 'Chất lượng món ăn, thực đơn' },
            { name: 'Cơ sở vật chất', description: 'Phòng ốc, thiết bị, sân vườn' },
            { name: 'Y tế & Thuốc', description: 'Vấn đề sức khỏe, cấp phát thuốc' }
          ]
        }
      }
    }
  })
  console.log('🏥 Institution created.')

  // --- 2. USERS: SUPER ADMIN & STAFF (Bulk Generation) ---
  await prisma.user.create({
    data: {
      email: 'superadmin@helicare.vn',
      password: passwordHash,
      role: UserRole.PlatformSuperAdmin,
      status: UserStatus.active
    }
  })

  // Staff roles array to cycle through
  const staffRoles = [
    { pos: StaffPosition.NURSE, prefix: 'nurse', title: 'Y tá' },
    { pos: StaffPosition.PHYSICIAN, prefix: 'doctor', title: 'Bác sĩ' },
    { pos: StaffPosition.CAREGIVER, prefix: 'care', title: 'Hộ lý' },
    { pos: StaffPosition.DIETITIAN, prefix: 'chef', title: 'Dinh dưỡng' },
    { pos: StaffPosition.ACTIVITY_COORDINATOR, prefix: 'activity', title: 'Hoạt náo viên' },
    { pos: StaffPosition.THERAPIST, prefix: 'therapist', title: 'Vật lý trị liệu' }
  ]

  const staffIds: string[] = [] // Store for assigning tasks later

  console.log('👩‍⚕️ Generating Staff...')
  for (let i = 1; i <= 20; i++) {
    const roleConfig = staffRoles[i % staffRoles.length]
    const gender = Math.random() > 0.5 ? Gender.male : Gender.female
    const fullName = `${roleConfig.title} ${generateName(gender)}`

    const staff = await prisma.user.create({
      data: {
        email: `${roleConfig.prefix}${i}@helicare.vn`,
        password: passwordHash,
        role: i <= 2 ? UserRole.Admin : UserRole.Staff, // 2 người đầu là Admin
        status: UserStatus.active,
        institution_id: institution.institution_id,
        staffProfile: {
          create: {
            institution_id: institution.institution_id,
            full_name: fullName,
            phone: `090${getRandomInt(1000000, 9999999)}`,
            position: roleConfig.pos,
            hire_date: getRandomDatePast(1000),
            avatar: DUMMY_IMAGE_URL
          }
        }
      }
    })
    staffIds.push(staff.user_id)
  }

  // --- 3. KITCHEN & NUTRITION (Rich Data) ---
  console.log('🥦 Generating Kitchen Data...')

  // Ingredients (Nguyên liệu)
  const ingredientsData = [
    { name: 'Gạo tẻ ST25', unit: IngredientUnit.g, cal: 130, pro: 2.7, fat: 0.3, carb: 28 },
    { name: 'Ức gà', unit: IngredientUnit.g, cal: 165, pro: 31, fat: 3.6, carb: 0 },
    { name: 'Thịt heo nạc', unit: IngredientUnit.g, cal: 242, pro: 27, fat: 14, carb: 0 },
    { name: 'Cá hồi', unit: IngredientUnit.g, cal: 208, pro: 20, fat: 13, carb: 0 },
    { name: 'Trứng gà', unit: IngredientUnit.pcs, cal: 155, pro: 13, fat: 11, carb: 1.1 },
    { name: 'Bí đỏ', unit: IngredientUnit.g, cal: 26, pro: 1, fat: 0.1, carb: 6.5 },
    { name: 'Rau ngót', unit: IngredientUnit.g, cal: 35, pro: 5.3, fat: 0, carb: 3.4 },
    { name: 'Cà rốt', unit: IngredientUnit.g, cal: 41, pro: 0.9, fat: 0.2, carb: 9.6 },
    { name: 'Sữa không đường', unit: IngredientUnit.ml, cal: 42, pro: 3.4, fat: 1, carb: 5 },
    { name: 'Tôm sú', unit: IngredientUnit.g, cal: 99, pro: 24, fat: 0.3, carb: 0.2 }
  ]

  const createdIngredients = []
  for (const ing of ingredientsData) {
    const res = await prisma.ingredient.create({
      data: {
        institution_id: institution.institution_id,
        name: ing.name,
        unit: ing.unit,
        calories_per_100g: ing.cal,
        protein_per_100g: ing.pro,
        fat_per_100g: ing.fat,
        carbs_per_100g: ing.carb
      }
    })
    createdIngredients.push(res)
  }

  // Dishes (Món ăn) - Kết hợp nguyên liệu
  const dishesData = [
    { name: 'Cháo cá hồi bí đỏ', texture: DishTexture.Pureed, ings: ['Cá hồi', 'Bí đỏ', 'Gạo tẻ ST25'] },
    { name: 'Canh rau ngót thịt bằm', texture: DishTexture.Minced, ings: ['Rau ngót', 'Thịt heo nạc'] },
    { name: 'Cơm gà xé phay', texture: DishTexture.Regular, ings: ['Gạo tẻ ST25', 'Ức gà'] },
    { name: 'Súp tôm cà rốt', texture: DishTexture.Pureed, ings: ['Tôm sú', 'Cà rốt'] },
    // FIX: Thay SoftTexture (không tồn tại) bằng Minced
    { name: 'Trứng hấp vân', texture: DishTexture.Minced, ings: ['Trứng gà'] },
    { name: 'Thịt heo kho tiêu', texture: DishTexture.Regular, ings: ['Thịt heo nạc'] },
    { name: 'Sữa nóng', texture: DishTexture.Regular, ings: ['Sữa không đường'] }
  ]

  const createdDishes = []
  for (const d of dishesData) {
    // Find ingredient IDs
    const dishIngs = createdIngredients
      .filter((ci) => d.ings.includes(ci.name))
      .map((ci) => ({
        ingredient_id: ci.ingredient_id,
        amount: getRandomInt(50, 200)
      }))

    const dish = await prisma.dish.create({
      data: {
        institution_id: institution.institution_id,
        name: d.name,
        // FIX: Xóa đoạn check logic lỗi, gán trực tiếp giá trị hợp lệ
        texture: d.texture,
        calories_per_100g: getRandomInt(80, 250),
        dishIngredients: { create: dishIngs }
      }
    })
    createdDishes.push(dish)
  }
  // Weekly Menu (Tuần hiện tại)
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(monday.getDate() - monday.getDay() + 1)

  const menu = await prisma.weeklyMenu.create({
    data: {
      institution_id: institution.institution_id,
      week_start_date: monday,
      week_end_date: new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000),
      created_by_id: staffIds[0]
    }
  })

  // Fill Menu Items for 7 days
  const mealSlots = [MealSlot.Breakfast, MealSlot.Lunch, MealSlot.Dinner]
  for (let day = 0; day <= 6; day++) {
    for (const slot of mealSlots) {
      await prisma.weeklyMenuItem.create({
        data: {
          menu_id: menu.menu_id,
          dish_id: getRandomElement(createdDishes).dish_id,
          day_of_week: day,
          meal_slot: slot,
          servings: 50
        }
      })
    }
  }

  // --- 4. ROOMS ---
  console.log('🛏️ Generating Rooms...')
  const roomTypes = [RoomType.single, RoomType.double, RoomType.multi]
  const roomIds: string[] = []

  for (let i = 1; i <= 20; i++) {
    const type = roomTypes[i % 3]
    const capacity = type === RoomType.single ? 1 : type === RoomType.double ? 2 : 4

    const room = await prisma.room.create({
      data: {
        institution_id: institution.institution_id,
        room_number: `P${100 + i}`,
        type: type,
        capacity: capacity,
        current_occupancy: 0,
        is_available: true,
        notes: i % 5 === 0 ? 'Phòng có view vườn' : undefined
      }
    })
    roomIds.push(room.room_id)
  }

  // --- 5. RESIDENTS & FAMILIES (The Big Loop) ---
  console.log('👴👵 Generating Residents, Families & Operations...')

  // Diseases & Allergies Pool
  const chronicDiseasesList = [
    'Cao huyết áp',
    'Tiểu đường Type 2',
    'Thoái hóa khớp',
    'Suy tim',
    'Parkinson',
    'Alzheimer',
    'Rối loạn tiền đình'
  ]
  const allergiesList = ['Hải sản', 'Đậu phộng', 'Gluten', 'Lactose', 'Penicillin']

  // Loop tạo 30 cặp (Gia đình - Cụ)
  for (let i = 1; i <= 30; i++) {
    const gender = Math.random() > 0.5 ? Gender.male : Gender.female
    const resName = generateName(gender)
    const birthYear = getRandomInt(1935, 1955)

    // 5.1 Create Resident
    // Pick a room (simple logic: random room, don't worry about capacity overflow for seeding simply, or pick one)
    const roomId = getRandomElement(roomIds)

    // Tính BMI
    const height = getRandomInt(150, 175)
    const weight = getRandomInt(45, 80)
    const bmi = parseFloat((weight / (height / 100) ** 2).toFixed(1))

    const resident = await prisma.resident.create({
      data: {
        institution_id: institution.institution_id,
        full_name: resName,
        gender: gender,
        date_of_birth: new Date(`${birthYear}-${getRandomInt(1, 12)}-${getRandomInt(1, 28)}`),
        status: ResidentStatus.active,
        admission_date: getRandomDatePast(365),
        room_id: roomId,
        assigned_staff_id: getRandomElement(staffIds),
        height_cm: height,
        weight_kg: weight,
        bmi: bmi,
        notes: 'Cụ có thói quen dậy sớm tập thể dục.',
        // Health Profile
        chronicDiseases: {
          create: [
            {
              name: getRandomElement(chronicDiseasesList),
              status: 'ACTIVE',
              severity: 'MODERATE',
              diagnosed_at: getRandomDatePast(1000)
            }
          ]
        },
        allergies:
          Math.random() > 0.7
            ? {
                // 30% chance of allergy
                create: [{ substance: getRandomElement(allergiesList), severity: 'MILD', reaction: 'Mẩn ngứa' }]
              }
            : undefined
      }
    })

    // Update Room Occupancy (Simple simulation)
    await prisma.room.update({
      where: { room_id: roomId },
      data: { current_occupancy: { increment: 1 } }
    })

    // Diet Tags Logic (nếu bệnh tiểu đường -> Low Sugar)
    const hasDiabetes = await prisma.chronicDisease.findFirst({
      where: { resident_id: resident.resident_id, name: { contains: 'Tiểu đường' } }
    })
    if (hasDiabetes || Math.random() > 0.8) {
      await prisma.residentDietTag.create({
        data: {
          resident_id: resident.resident_id,
          tag_type: DietTagType.LowSugar,
          tag_name: 'Chế độ tiểu đường',
          source_type: 'medical_record',
          is_active: true
        }
      })
    }

    // 5.2 Create Family User
    const famGender = Math.random() > 0.5 ? Gender.male : Gender.female
    const family = await prisma.user.create({
      data: {
        email: `family${i}@gmail.com`,
        password: passwordHash,
        role: UserRole.Family,
        status: UserStatus.active,
        institution_id: institution.institution_id,
        familyProfile: {
          create: {
            full_name: generateName(famGender),
            phone: `09${getRandomInt(10000000, 99999999)}`,
            address: 'TP. Hồ Chí Minh'
          }
        }
      }
    })

    // 5.3 Link Resident - Family (Must be ACTIVE)
    await prisma.familyResidentLink.create({
      data: {
        family_user_id: family.user_id,
        resident_id: resident.resident_id,
        institution_id: institution.institution_id,
        family_email: `family${i}@gmail.com`,
        status: FamilyLinkStatus.active
      }
    })

    // 5.4 Service Contract & Payment
    const contract = await prisma.serviceContract.create({
      data: {
        resident_id: resident.resident_id,
        institution_id: institution.institution_id,
        billing_cycle: BillingCycle.MONTHLY,
        amount: 15000000,
        start_date: getRandomDatePast(60),
        next_billing_date: getRandomDateFuture(30),
        is_active: true
      }
    })

    // Create a payment history
    await prisma.payment.create({
      data: {
        contract_id: contract.contract_id,
        payer_id: family.user_id,
        amount: 15000000,
        payment_method: PaymentMethod.TRANSFER,
        status: PaymentStatus.SUCCESS,
        transaction_ref: `VNPay${getRandomInt(10000, 99999)}`,
        period_start: new Date(),
        period_end: getRandomDateFuture(30),
        verified_by_id: staffIds[0] // Admin verified
      }
    })

    // 5.5 Create some Care Logs & Health Assessments
    // Assessment
    await prisma.healthAssessment.create({
      data: {
        resident_id: resident.resident_id,
        assessed_by_id: getRandomElement(staffIds),
        blood_pressure_systolic: getRandomInt(110, 140),
        blood_pressure_diastolic: getRandomInt(70, 90),
        heart_rate: getRandomInt(60, 90),
        temperature_c: 36.5,
        oxygen_saturation: getRandomInt(95, 99),
        notes: 'Sức khỏe ổn định'
      }
    })

    // Care Logs (3 logs per resident)
    const logTypes = [CareLogType.meal, CareLogType.medication, CareLogType.hygiene]
    for (const lType of logTypes) {
      await prisma.careLog.create({
        data: {
          institution_id: institution.institution_id,
          resident_id: resident.resident_id,
          staff_id: getRandomElement(staffIds), // Random staff performed task
          type: lType,
          title:
            lType === CareLogType.meal
              ? 'Hỗ trợ ăn trưa'
              : lType === CareLogType.medication
                ? 'Uống thuốc chiều'
                : 'Vệ sinh cá nhân',
          status: CareTaskStatus.completed,
          start_time: getRandomDatePast(1),
          end_time: new Date(),
          notes: 'Hoàn thành tốt'
        }
      })
    }
  }

  // --- 6. BLOG & SOCIAL INTERACTION (Using Dummy Image) ---
  console.log('📱 Generating Social Media Content...')

  const postContents = [
    'Hôm nay viện tổ chức tiệc sinh nhật tháng cho các cụ, không khí thật ấm cúng! 🎂',
    'Buổi tập dưỡng sinh sáng nay giúp các cụ khỏe khoắn hơn rất nhiều. 💪',
    'Thực đơn mới tuần này có món cháo cá hồi, các cụ khen rất ngon. 🍲',
    'Góc vườn nhỏ của viện đã nở hoa rực rỡ, các cụ rất thích ra đây hóng mát. 🌸',
    'Chúc mừng cụ Nguyễn Văn A đã phục hồi sức khỏe tốt và xuất viện về với gia đình.'
  ]

  const createdPosts = []

  // Random 5-10 posts created by Staff
  for (let i = 0; i < 8; i++) {
    const author = getRandomElement(staffIds)
    const post = await prisma.post.create({
      data: {
        institution_id: institution.institution_id,
        author_id: author,
        title: `Tin tức hoạt động #${i + 1}`,
        content: getRandomElement(postContents),
        image_urls: [DUMMY_IMAGE_URL], // URL cố định theo yêu cầu
        tags: ['HoatDong', 'DoiSong', 'SucKhoe'],
        visibility: 'PUBLIC',
        likes_count: 0 // Will increment later
      }
    })
    createdPosts.push(post)
  }

  // Generate Interaction (Likes & Comments) from Families
  const allFamilies = await prisma.user.findMany({ where: { role: UserRole.Family } })

  for (const post of createdPosts) {
    // Random 3-5 likes per post
    const randomFamilies = allFamilies.sort(() => 0.5 - Math.random()).slice(0, getRandomInt(3, 6))

    for (const fam of randomFamilies) {
      // Like
      await prisma.postLike.create({
        data: {
          post_id: post.post_id,
          user_id: fam.user_id
        }
      })

      // Comment (50% chance)
      if (Math.random() > 0.5) {
        await prisma.comment.create({
          data: {
            post_id: post.post_id,
            user_id: fam.user_id,
            content: getRandomElement([
              'Tuyệt vời quá!',
              'Cảm ơn các bác sĩ',
              'Mong các cụ luôn khỏe mạnh',
              'Nhìn vui quá'
            ])
          }
        })
      }
    }
    // Update count
    await prisma.post.update({
      where: { post_id: post.post_id },
      data: { likes_count: randomFamilies.length }
    })
  }

  console.log('✅ SEEDING FINISHED SUCCESSFULLY!')
  console.log('-----------------------------------')
  console.log(`- Residents created: 30`)
  console.log(`- Families created: 30`)
  console.log(`- Staff created: 20`)
  console.log(`- Posts created: ${createdPosts.length}`)
  console.log('-----------------------------------')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
