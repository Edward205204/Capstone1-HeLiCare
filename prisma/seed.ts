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
  DishTexture,
  IngredientUnit,
  MealSlot,
  BillingCycle,
  PaymentMethod,
  PaymentStatus,
  DietTagType,
  FamilyLinkStatus,
  MedicationForm,
  MedicationTiming,
  ActivityType,
  ScheduleFrequency,
  ActivityStatus,
  EventType,
  EventStatus,
  CareSubType,
  EventFrequency,
  VisitStatus,
  VisitTimeBlock,
  FeedbackStatus,
  SOSAlertType,
  SOSAlertSeverity,
  SOSAlertStatus,
  IncidentType,
  ResidentAssessmentStatus,
  TimeSlot
} from '@prisma/client'
import { hashPassword } from '../src/utils/hash'

const prisma = new PrismaClient()

// --- UTILS: Helper Random ---
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const getRandomDatePast = (days: number) => new Date(Date.now() - getRandomInt(0, days) * 24 * 60 * 60 * 1000)
const getRandomDateFuture = (days: number) => new Date(Date.now() + getRandomInt(1, days) * 24 * 60 * 60 * 1000)

// Data Tiếng Việt
const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ']
const middleNamesMale = ['Văn', 'Hữu', 'Đức', 'Thành', 'Công', 'Minh', 'Quốc', 'Thế', 'Gia', 'Xuân']
const middleNamesFemale = ['Thị', 'Thanh', 'Thu', 'Ngọc', 'Mỹ', 'Kim', 'Lan', 'Hồng', 'Bích', 'Diệu']
const firstNamesMale = ['Hùng', 'Cường', 'Dũng', 'Nam', 'Trung', 'Hiếu', 'Nghĩa', 'Quân', 'Tuấn', 'Tâm', 'Sơn', 'Lâm']
const firstNamesFemale = ['Hoa', 'Huệ', 'Lan', 'Mai', 'Cúc', 'Trúc', 'Quỳnh', 'Hương', 'Thảo', 'Ly', 'Nga', 'Vân']

const generateName = (gender: Gender) => {
  const last = getRandomElement(lastNames)
  const middle = gender === Gender.male ? getRandomElement(middleNamesMale) : getRandomElement(middleNamesFemale)
  const first = gender === Gender.male ? getRandomElement(firstNamesMale) : getRandomElement(firstNamesFemale)
  return `${last} ${middle} ${first}`
}

const generatePhone = () => `09${getRandomInt(10000000, 99999999)}`

// Link ảnh cố định theo yêu cầu
const DUMMY_IMAGE_URL = 'http://localhost:3000/api/media/static/images/ehwjmgcc0k0bv7h5f9bxbx35v.jpg'
// Password chung cho tất cả account
const COMMON_PASS = 'Mk@01234567890'

async function main() {
  console.log('🚀 Starting HEAVY SCALE Seeding...')

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
  } catch {
    console.log('⚠️ Cleanup warnings (safe to ignore if first run).')
  }

  const pwData = await hashPassword(COMMON_PASS)
  const passwordHash = pwData.password

  // --- 1. INSTITUTION ---
  const institution = await prisma.institution.create({
    data: {
      name: 'Viện Dưỡng Lão HeLiCare Premium',
      address: {
        province: 'Đà Nẵng',
        district: 'Ngũ Hành Sơn',
        ward: 'Hòa Quý',
        street: 'Nam Kỳ Khởi Nghĩa',
        detail: 'Khu Đô Thị FPT City'
      },
      contact_info: { phone: '0236.999.888', email: 'contact@helicare.vn', website: 'https://helicare.vn' },
      status: InstitutionContractStatus.active,
      visitConfiguration: {
        create: {
          max_visitors_per_day: 200,
          max_visitors_per_slot: 50,
          advance_booking_days: 30,
          cancellation_hours: 2
        }
      },
      visitTimeSlots: {
        createMany: {
          data: [
            { name: 'Sáng (08:00 - 11:00)', start_time: '08:00', end_time: '11:00' },
            { name: 'Chiều (14:00 - 17:00)', start_time: '14:00', end_time: '17:00' },
            { name: 'Tối (18:00 - 20:00)', start_time: '18:00', end_time: '20:00' }
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
  console.log('🏥 Institution Created')

  // --- 2. ADMIN ACCOUNTS ---
  await prisma.user.create({
    data: {
      email: 'superadmin@helicare.vn',
      password: passwordHash,
      role: UserRole.PlatformSuperAdmin,
      status: UserStatus.active
    }
  })
  console.log('👤 Created: superadmin@helicare.vn (Platform)')

  await prisma.user.create({
    data: {
      email: 'manager@helicare.vn',
      password: passwordHash,
      role: UserRole.RootAdmin,
      status: UserStatus.active,
      institution_id: institution.institution_id,
      staffProfile: {
        create: {
          institution_id: institution.institution_id,
          full_name: 'Trần Viện Trưởng',
          phone: generatePhone(),
          position: StaffPosition.OTHER,
          hire_date: new Date('2020-01-01'),
          avatar: DUMMY_IMAGE_URL
        }
      }
    }
  })
  console.log('👤 Created: manager@helicare.vn (Root Admin)')

  console.log('👥 Creating 10 Institution Admins...')
  for (let i = 1; i <= 10; i++) {
    await prisma.user.create({
      data: {
        email: `admin${i}@helicare.vn`,
        password: passwordHash,
        role: UserRole.Admin,
        status: UserStatus.active,
        institution_id: institution.institution_id,
        staffProfile: {
          create: {
            institution_id: institution.institution_id,
            full_name: `Admin Số ${i}`,
            phone: generatePhone(),
            position: StaffPosition.OTHER,
            hire_date: getRandomDatePast(500),
            avatar: DUMMY_IMAGE_URL
          }
        }
      }
    })
  }

  // --- 3. STAFF ACCOUNTS ---
  const staffIds: string[] = []

  async function createStaffBatch(
    role: UserRole,
    position: StaffPosition,
    prefix: string,
    count: number,
    nameTitle: string
  ) {
    console.log(`👥 Creating ${count} ${nameTitle} (${prefix}1 -> ${prefix}${count})...`)
    for (let i = 1; i <= count; i++) {
      const gender = Math.random() > 0.5 ? Gender.male : Gender.female
      const fullName = `${nameTitle} ${generateName(gender)}`

      const user = await prisma.user.create({
        data: {
          email: `${prefix}${i}@helicare.vn`,
          password: passwordHash,
          role: role,
          status: UserStatus.active,
          institution_id: institution.institution_id,
          staffProfile: {
            create: {
              institution_id: institution.institution_id,
              full_name: fullName,
              phone: generatePhone(),
              position: position,
              hire_date: getRandomDatePast(1000),
              avatar: DUMMY_IMAGE_URL,
              notes: `Nhân viên ${nameTitle} xuất sắc số ${i}`
            }
          }
        }
      })
      staffIds.push(user.user_id)
    }
  }

  await createStaffBatch(UserRole.Staff, StaffPosition.NURSE, 'nurse', 50, 'Y Tá')
  await createStaffBatch(UserRole.Staff, StaffPosition.CAREGIVER, 'caregiver', 50, 'Hộ Lý')
  await createStaffBatch(UserRole.Staff, StaffPosition.PHYSICIAN, 'doctor', 20, 'Bác Sĩ')
  await createStaffBatch(UserRole.Staff, StaffPosition.DIETITIAN, 'chef', 10, 'Đầu Bếp')
  await createStaffBatch(UserRole.Staff, StaffPosition.ACTIVITY_COORDINATOR, 'activity', 10, 'Hoạt Náo Viên')

  // --- 4. ROOMS (Logic theo dõi phòng & Cấu trúc mới) ---
  console.log('🛏️ Generating 100 Rooms (Mostly Multi-10)...')

  interface RoomTracker {
    id: string
    capacity: number
    current: number
  }
  const roomTrackers: RoomTracker[] = []

  // Tạo 100 phòng
  for (let i = 1; i <= 100; i++) {
    let type = RoomType.multi as RoomType
    let capacity = 10
    let note = 'Phòng sinh hoạt chung lớn (10 giường)'

    // Logic phân chia phòng
    if (i <= 5) {
      // 5 phòng đầu: Single (VIP)
      type = RoomType.single
      capacity = 1
      note = 'Phòng VIP đơn (View vườn)'
    } else if (i <= 15) {
      // 10 phòng tiếp theo: Double
      type = RoomType.double
      capacity = 2
      note = 'Phòng đôi tiêu chuẩn'
    }
    // Các phòng còn lại (16 -> 100): Multi (10 người)

    const room = await prisma.room.create({
      data: {
        institution_id: institution.institution_id,
        room_number: `P${100 + i}`,
        type: type,
        capacity: capacity,
        current_occupancy: 0,
        is_available: true,
        notes: note
      }
    })

    roomTrackers.push({
      id: room.room_id,
      capacity: capacity,
      current: 0
    })
  }

  // --- 5. KITCHEN & NUTRITION ---
  console.log('🥦 Generating Kitchen Data...')
  const ingredientsData = [
    { name: 'Gạo tẻ ST25', unit: IngredientUnit.g, cal: 130 },
    { name: 'Ức gà', unit: IngredientUnit.g, cal: 165 },
    { name: 'Thịt heo nạc', unit: IngredientUnit.g, cal: 242 },
    { name: 'Cá hồi', unit: IngredientUnit.g, cal: 208 },
    { name: 'Trứng gà', unit: IngredientUnit.pcs, cal: 155 },
    { name: 'Bí đỏ', unit: IngredientUnit.g, cal: 26 },
    { name: 'Rau ngót', unit: IngredientUnit.g, cal: 35 },
    { name: 'Cà rốt', unit: IngredientUnit.g, cal: 41 },
    { name: 'Sữa không đường', unit: IngredientUnit.ml, cal: 42 },
    { name: 'Tôm sú', unit: IngredientUnit.g, cal: 99 },
    { name: 'Khoai tây', unit: IngredientUnit.g, cal: 77 },
    { name: 'Cải bó xôi', unit: IngredientUnit.g, cal: 23 },
    { name: 'Thịt bò', unit: IngredientUnit.g, cal: 250 },
    { name: 'Chuối', unit: IngredientUnit.pcs, cal: 89 }
  ]

  const createdIngredients = []
  for (const ing of ingredientsData) {
    const res = await prisma.ingredient.create({
      data: {
        institution_id: institution.institution_id,
        name: ing.name,
        unit: ing.unit,
        calories_per_100g: ing.cal,
        protein_per_100g: getRandomInt(0, 30),
        fat_per_100g: getRandomInt(0, 15),
        carbs_per_100g: getRandomInt(0, 50)
      }
    })
    createdIngredients.push(res)
  }

  const dishesData = [
    { name: 'Cháo cá hồi bí đỏ', texture: DishTexture.Pureed, ings: ['Cá hồi', 'Bí đỏ', 'Gạo tẻ ST25'] },
    { name: 'Canh rau ngót thịt bằm', texture: DishTexture.Minced, ings: ['Rau ngót', 'Thịt heo nạc'] },
    { name: 'Cơm gà xé phay', texture: DishTexture.Regular, ings: ['Gạo tẻ ST25', 'Ức gà'] },
    { name: 'Súp tôm cà rốt', texture: DishTexture.Pureed, ings: ['Tôm sú', 'Cà rốt'] },
    { name: 'Trứng hấp vân', texture: DishTexture.Minced, ings: ['Trứng gà'] },
    { name: 'Thịt heo kho tiêu', texture: DishTexture.Regular, ings: ['Thịt heo nạc'] },
    { name: 'Sữa nóng', texture: DishTexture.Regular, ings: ['Sữa không đường'] },
    { name: 'Bò hầm khoai tây', texture: DishTexture.Minced, ings: ['Thịt bò', 'Khoai tây'] },
    { name: 'Sinh tố chuối', texture: DishTexture.Pureed, ings: ['Chuối', 'Sữa không đường'] },
    { name: 'Cải bó xôi xào tỏi', texture: DishTexture.Regular, ings: ['Cải bó xôi'] }
  ]

  const createdDishes = []
  for (const d of dishesData) {
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
        texture: d.texture,
        calories_per_100g: getRandomInt(80, 250),
        dishIngredients: { create: dishIngs },
        is_blendable: true
      }
    })
    createdDishes.push(dish)
  }

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

  const mealSlots = [MealSlot.Breakfast, MealSlot.Lunch, MealSlot.Dinner]
  for (let day = 0; day <= 6; day++) {
    for (const slot of mealSlots) {
      await prisma.weeklyMenuItem.create({
        data: {
          menu_id: menu.menu_id,
          dish_id: getRandomElement(createdDishes).dish_id,
          day_of_week: day,
          meal_slot: slot,
          servings: 100
        }
      })
    }
  }

  // --- 6. RESIDENTS & FAMILIES (Lấp đầy phòng tuần tự) ---
  console.log('👴👵 Generating 50 Residents & Families (Filling rooms sequentially)...')

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

  for (let i = 1; i <= 50; i++) {
    // Logic tìm phòng trống đầu tiên (Single -> Double -> Multi)
    const targetRoom = roomTrackers.find((r) => r.current < r.capacity)

    if (!targetRoom) {
      console.warn('⚠️ Hết phòng trống! Không thể thêm Resident mới.')
      break
    }

    targetRoom.current++

    const gender = Math.random() > 0.5 ? Gender.male : Gender.female
    const resName = generateName(gender)
    const birthYear = getRandomInt(1935, 1955)
    const height = getRandomInt(150, 175)
    const weight = getRandomInt(45, 80)
    const bmi = parseFloat((weight / (height / 100) ** 2).toFixed(1))

    // 6.1 Create Resident
    const resident = await prisma.resident.create({
      data: {
        institution_id: institution.institution_id,
        full_name: resName,
        gender: gender,
        date_of_birth: new Date(`${birthYear}-${getRandomInt(1, 12)}-${getRandomInt(1, 28)}`),
        status: ResidentStatus.active,
        admission_date: getRandomDatePast(365),
        room_id: targetRoom.id,
        assigned_staff_id: getRandomElement(staffIds),
        height_cm: height,
        weight_kg: weight,
        bmi: bmi,
        notes: 'Cụ hòa đồng, ăn uống tốt.',
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
                create: [{ substance: getRandomElement(allergiesList), severity: 'MILD', reaction: 'Mẩn ngứa, đỏ da' }]
              }
            : undefined
      }
    })

    // Update Room (Database)
    await prisma.room.update({
      where: { room_id: targetRoom.id },
      data: { current_occupancy: { increment: 1 } }
    })

    // Diet Tags
    const hasDiabetes = await prisma.chronicDisease.findFirst({
      where: { resident_id: resident.resident_id, name: { contains: 'Tiểu đường' } }
    })
    if (hasDiabetes) {
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

    // 6.2 Family
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
            phone: generatePhone(),
            address: 'TP. Đà Nẵng'
          }
        }
      }
    })

    await prisma.familyResidentLink.create({
      data: {
        family_user_id: family.user_id,
        resident_id: resident.resident_id,
        institution_id: institution.institution_id,
        family_email: `family${i}@gmail.com`,
        status: FamilyLinkStatus.active
      }
    })

    // 6.4 Contract
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

    await prisma.payment.create({
      data: {
        contract_id: contract.contract_id,
        payer_id: family.user_id,
        amount: 15000000,
        payment_method: PaymentMethod.TRANSFER,
        status: PaymentStatus.SUCCESS,
        transaction_ref: `BANK${getRandomInt(10000, 99999)}`,
        proof_image_url: DUMMY_IMAGE_URL,
        period_start: new Date(),
        period_end: getRandomDateFuture(30),
        verified_by_id: staffIds[0]
      }
    })

    await prisma.healthAssessment.create({
      data: {
        resident_id: resident.resident_id,
        assessed_by_id: getRandomElement(staffIds),
        blood_pressure_systolic: getRandomInt(110, 140),
        blood_pressure_diastolic: getRandomInt(70, 90),
        heart_rate: getRandomInt(60, 90),
        temperature_c: 36.5,
        oxygen_saturation: getRandomInt(95, 99),
        notes: 'Chỉ số bình thường',
        measured_at: new Date()
      }
    })

    for (let k = 0; k < 5; k++) {
      await prisma.careLog.create({
        data: {
          institution_id: institution.institution_id,
          resident_id: resident.resident_id,
          staff_id: getRandomElement(staffIds),
          type: getRandomElement([CareLogType.meal, CareLogType.medication, CareLogType.exercise]),
          title: 'Hoạt động chăm sóc định kỳ',
          status: CareTaskStatus.completed,
          start_time: getRandomDatePast(2),
          notes: 'Cụ hợp tác tốt'
        }
      })
    }
  }

  // --- 7. BLOG & INTERACTIONS ---
  console.log('📱 Generating Blog & Interactions...')

  const postContents = [
    'Buổi tập Yoga cười sáng nay thật vui vẻ! 🧘‍♀️',
    'Chúc mừng sinh nhật tháng các cụ, bánh kem rất ngon 🎂',
    'Thực đơn chay hôm nay nhận được nhiều lời khen 🥗',
    'Hoạt động vẽ tranh thư giãn chiều thứ 7 🎨',
    'Thông báo lịch khám sức khỏe định kỳ tuần sau 👨‍⚕️',
    'Góc vườn mới được cải tạo, mời gia đình ghé thăm 🌻',
    'Cập nhật quy định thăm nuôi mới (Áp dụng từ tháng sau) 📋'
  ]

  const createdPosts = []
  for (let i = 0; i < 20; i++) {
    const author = getRandomElement(staffIds)
    const post = await prisma.post.create({
      data: {
        institution_id: institution.institution_id,
        author_id: author,
        title: `Tin tức hoạt động - Bài viết số ${i + 1}`,
        content: getRandomElement(postContents),
        image_urls: [DUMMY_IMAGE_URL],
        tags: ['HoatDong', 'TinTuc'],
        visibility: 'PUBLIC',
        likes_count: 0
      }
    })
    createdPosts.push(post)
  }

  const allFamilies = await prisma.user.findMany({ where: { role: UserRole.Family } })

  for (const post of createdPosts) {
    const randomFamilies = allFamilies.sort(() => 0.5 - Math.random()).slice(0, getRandomInt(5, 15))

    for (const fam of randomFamilies) {
      await prisma.postLike.create({
        data: { post_id: post.post_id, user_id: fam.user_id }
      })

      if (Math.random() > 0.6) {
        await prisma.comment.create({
          data: {
            post_id: post.post_id,
            user_id: fam.user_id,
            content: getRandomElement(['Tuyệt vời!', 'Cảm ơn các cô', 'Bố tôi trông vui quá', 'Like mạnh!'])
          }
        })
      }
    }
    await prisma.post.update({
      where: { post_id: post.post_id },
      data: { likes_count: randomFamilies.length }
    })
  }

  // --- 8. TẠO TÀI KHOẢN MOCK (DBM) CHO TẤT CẢ USER ---
  console.log('💰 Creating Mock Bank Accounts (DBM) for all users...')

  // Lấy tất cả user (Family và Resident)
  const allUsers = await prisma.user.findMany({
    where: {
      role: {
        in: [UserRole.Family, UserRole.Resident]
      }
    },
    select: {
      user_id: true,
      email: true,
      role: true
    }
  })

  let createdAccounts = 0
  for (const user of allUsers) {
    // Kiểm tra xem đã có tài khoản chưa
    const existingAccount = await prisma.dBM_UserAccount.findUnique({
      where: { user_id: user.user_id }
    })

    if (!existingAccount) {
      await prisma.dBM_UserAccount.create({
        data: {
          user_id: user.user_id,
          balance: 100000000, // 100 triệu VND mặc định
          currency: 'VND',
          status: 'active',
          bank_name: 'NCB'
        }
      })
      createdAccounts++
    }
  }

  console.log(`✅ Created ${createdAccounts} mock bank accounts (${allUsers.length} total users)`)

  // --- 9. TẠO DBM_PAYMENT_LOG TỪ CÁC PAYMENT ĐÃ CÓ ---
  console.log('📊 Creating DBM_PaymentLog from existing payments...')

  // Lấy tất cả payments đã có
  const allPayments = await prisma.payment.findMany({
    include: {
      contract: {
        include: {
          resident: {
            select: {
              resident_id: true,
              full_name: true
            }
          },
          institution: {
            select: {
              institution_id: true,
              name: true
            }
          }
        }
      },
      payer: {
        include: {
          familyProfile: {
            select: {
              full_name: true
            }
          },
          resident: {
            select: {
              full_name: true
            }
          }
        }
      }
    }
  })

  let createdLogs = 0
  for (const payment of allPayments) {
    // Kiểm tra xem đã có log chưa
    const existingLog = await prisma.dBM_PaymentLog.findUnique({
      where: { payment_id: payment.payment_id }
    })

    if (!existingLog && payment.contract) {
      // Lấy tài khoản của payer nếu có
      let accountId: string | null = null
      let transactionId: string | null = null

      if (payment.payer_id) {
        const account = await prisma.dBM_UserAccount.findUnique({
          where: { user_id: payment.payer_id }
        })
        if (account) {
          accountId = account.account_id

          // Tìm transaction history nếu có
          const transaction = await prisma.dBM_TransactionHistory.findFirst({
            where: {
              account_id: account.account_id,
              payment_id: payment.payment_id
            }
          })
          if (transaction) {
            transactionId = transaction.transaction_id
          }
        }
      }

      // Xác định payer name
      const payerName =
        payment.payer?.familyProfile?.full_name ||
        payment.payer?.resident?.full_name ||
        payment.payer?.email ||
        'Unknown'

      // Xác định payer type
      const payerType =
        payment.payer?.role === 'Family' ? 'family' : payment.payer?.role === 'Resident' ? 'resident' : undefined

      // Map payment method
      const paymentMethodMap: Record<string, string> = {
        VNPAY: 'VNPAY',
        TRANSFER: 'TRANSFER',
        CASH: 'CASH'
      }
      const paymentMethod = paymentMethodMap[payment.payment_method] || 'TRANSFER'

      // Map payment status
      const statusMap: Record<string, string> = {
        SUCCESS: 'SUCCESS',
        FAILED: 'FAILED',
        PENDING: 'PENDING',
        CANCELLED: 'FAILED'
      }
      const status = statusMap[payment.status] || 'PENDING'

      try {
        await prisma.dBM_PaymentLog.create({
          data: {
            institution_id: payment.contract.institution_id,
            payment_id: payment.payment_id,
            amount: payment.amount,
            payment_method: paymentMethod,
            status: status,
            payer_id: payment.payer_id || undefined,
            payer_type: payerType,
            payer_name: payerName,
            resident_id: payment.contract.resident_id,
            resident_name: payment.contract.resident.full_name,
            contract_id: payment.contract_id,
            vnpay_order_id: payment.vnpay_order_id || undefined,
            vnpay_transaction_no: payment.vnpay_transaction_no || undefined,
            vnpay_response_code: payment.vnpay_response_code || undefined,
            vnpay_bank_code: payment.vnpay_bank_code || undefined,
            account_id: accountId || undefined,
            transaction_id: transactionId || undefined,
            period_start: payment.period_start,
            period_end: payment.period_end,
            notes: payment.notes || `Payment log created from seed data`
          }
        })
        createdLogs++
      } catch (error) {
        console.error(`Error creating payment log for payment ${payment.payment_id}:`, error)
      }
    }
  }

  console.log(`✅ Created ${createdLogs} payment logs from ${allPayments.length} existing payments`)

  // --- 10. TẠO THÊM PAYMENT LOGS VỚI CÁC NGÀY KHÁC NHAU ĐỂ CÓ DỮ LIỆU CHO CHART ---
  console.log('📈 Creating additional payment logs with different dates for chart data...')

  // Lấy một số contracts để tạo thêm payment logs
  const contracts = await prisma.serviceContract.findMany({
    take: 20, // Lấy 20 contracts đầu tiên
    include: {
      resident: {
        select: {
          resident_id: true,
          full_name: true
        }
      },
      institution: {
        select: {
          institution_id: true
        }
      },
      payments: {
        take: 1,
        orderBy: { created_at: 'desc' },
        include: {
          payer: {
            include: {
              familyProfile: {
                select: { full_name: true }
              }
            }
          }
        }
      }
    }
  })

  let additionalLogs = 0
  for (const contract of contracts) {
    if (contract.payments.length === 0) continue

    const lastPayment = contract.payments[0]
    const payer = lastPayment.payer

    // Tạo thêm 3-5 payment logs với các ngày trong quá khứ (30-180 ngày trước)
    const numLogs = getRandomInt(3, 5)
    for (let i = 0; i < numLogs; i++) {
      const daysAgo = getRandomInt(30, 180)
      const logDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

      // Tạo payment record giả (chỉ để có payment_id)
      const fakePayment = await prisma.payment.create({
        data: {
          contract_id: contract.contract_id,
          payer_id: payer?.user_id || null,
          amount: contract.amount,
          payment_method: getRandomElement([PaymentMethod.VNPAY, PaymentMethod.TRANSFER]),
          status: getRandomElement([
            PaymentStatus.SUCCESS,
            PaymentStatus.SUCCESS,
            PaymentStatus.SUCCESS,
            PaymentStatus.FAILED
          ]), // 75% success
          period_start: new Date(logDate.getTime() - 30 * 24 * 60 * 60 * 1000),
          period_end: logDate,
          created_at: logDate,
          transaction_ref: `SEED_${getRandomInt(10000, 99999)}`
        }
      })

      // Lấy account nếu có payer
      let accountId: string | null = null
      if (payer?.user_id) {
        const account = await prisma.dBM_UserAccount.findUnique({
          where: { user_id: payer.user_id }
        })
        if (account) {
          accountId = account.account_id
        }
      }

      const payerName = payer?.familyProfile?.full_name || payer?.email || 'Unknown'

      const paymentMethod = fakePayment.payment_method === 'VNPAY' ? 'VNPAY' : 'TRANSFER'
      const status = fakePayment.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED'

      try {
        await prisma.dBM_PaymentLog.create({
          data: {
            institution_id: contract.institution_id,
            payment_id: fakePayment.payment_id,
            amount: fakePayment.amount,
            payment_method: paymentMethod,
            status: status,
            payer_id: payer?.user_id || undefined,
            payer_type: payer?.role === 'Family' ? 'family' : undefined,
            payer_name: payerName,
            resident_id: contract.resident_id,
            resident_name: contract.resident.full_name,
            contract_id: contract.contract_id,
            account_id: accountId || undefined,
            period_start: fakePayment.period_start,
            period_end: fakePayment.period_end,
            notes: `Historical payment log for chart data`,
            created_at: logDate // Set created_at để có dữ liệu theo thời gian
          }
        })
        additionalLogs++
      } catch (error) {
        console.error(`Error creating additional payment log:`, error)
        // Xóa fake payment nếu không tạo được log
        await prisma.payment.delete({ where: { payment_id: fakePayment.payment_id } }).catch(() => {})
      }
    }
  }

  console.log(`✅ Created ${additionalLogs} additional payment logs for chart data`)

  // --- 11. TẠO MEDICATION (THUỐC) ---
  console.log('💊 Creating Medications...')
  const medicationsData: Array<{
    name: string
    dosage: string
    form: MedicationForm
    frequency: string
    timing: MedicationTiming
    instructions: string
  }> = [
    {
      name: 'Paracetamol',
      dosage: '500mg',
      form: MedicationForm.tablet,
      frequency: 'Mỗi 6 giờ',
      timing: MedicationTiming.after_meal,
      instructions: 'Uống sau khi ăn, không quá 4 viên/ngày'
    },
    {
      name: 'Aspirin',
      dosage: '100mg',
      form: MedicationForm.tablet,
      frequency: 'Một lần mỗi ngày',
      timing: MedicationTiming.after_meal,
      instructions: 'Uống sau bữa sáng, uống với nước đầy đủ'
    },
    {
      name: 'Metformin',
      dosage: '500mg',
      form: MedicationForm.tablet,
      frequency: 'Hai lần mỗi ngày',
      timing: MedicationTiming.with_meal,
      instructions: 'Uống trong bữa ăn để giảm tác dụng phụ'
    },
    {
      name: 'Amlodipine',
      dosage: '5mg',
      form: MedicationForm.tablet,
      frequency: 'Một lần mỗi ngày',
      timing: MedicationTiming.any_time,
      instructions: 'Uống vào cùng một giờ mỗi ngày'
    },
    {
      name: 'Omeprazole',
      dosage: '20mg',
      form: MedicationForm.capsule,
      frequency: 'Một lần mỗi ngày',
      timing: MedicationTiming.before_meal,
      instructions: 'Uống trước bữa sáng 30 phút'
    },
    {
      name: 'Vitamin D3',
      dosage: '1000 IU',
      form: MedicationForm.tablet,
      frequency: 'Một lần mỗi ngày',
      timing: MedicationTiming.any_time,
      instructions: 'Bổ sung canxi và vitamin D'
    },
    {
      name: 'Furosemide',
      dosage: '40mg',
      form: MedicationForm.tablet,
      frequency: 'Một lần mỗi ngày',
      timing: MedicationTiming.after_meal,
      instructions: 'Uống vào buổi sáng, uống nhiều nước'
    },
    {
      name: 'Atorvastatin',
      dosage: '20mg',
      form: MedicationForm.tablet,
      frequency: 'Một lần mỗi ngày',
      timing: MedicationTiming.any_time,
      instructions: 'Uống vào buổi tối trước khi ngủ'
    },
    {
      name: 'Insulin',
      dosage: '10 IU',
      form: MedicationForm.injection,
      frequency: 'Hai lần mỗi ngày',
      timing: MedicationTiming.before_meal,
      instructions: 'Tiêm trước bữa sáng và bữa tối'
    },
    {
      name: 'Warfarin',
      dosage: '5mg',
      form: MedicationForm.tablet,
      frequency: 'Một lần mỗi ngày',
      timing: MedicationTiming.any_time,
      instructions: 'Uống vào cùng một giờ, theo dõi INR định kỳ'
    }
  ]

  const createdMedications = []
  for (const med of medicationsData) {
    const medication = await prisma.medication.create({
      data: {
        institution_id: institution.institution_id,
        name: med.name,
        dosage: med.dosage,
        form: med.form,
        frequency: med.frequency,
        timing: med.timing,
        instructions: med.instructions,
        is_active: true
      }
    })
    createdMedications.push(medication)
  }
  console.log(`✅ Created ${createdMedications.length} medications`)

  // --- 12. TẠO MEDICATION CARE PLAN ASSIGNMENTS ---
  console.log('📋 Creating Medication Care Plan Assignments...')
  const allResidents = await prisma.resident.findMany({ take: 20 })
  const allRooms = await prisma.room.findMany({ take: 5 })

  for (let i = 0; i < 15; i++) {
    const medication = getRandomElement(createdMedications)
    const residentIds = allResidents
      .sort(() => 0.5 - Math.random())
      .slice(0, getRandomInt(1, 3))
      .map((r) => r.resident_id)
    const roomIds = allRooms
      .sort(() => 0.5 - Math.random())
      .slice(0, getRandomInt(1, 2))
      .map((r) => r.room_id)
    const staffIdsForMed = staffIds.sort(() => 0.5 - Math.random()).slice(0, getRandomInt(1, 2))

    await prisma.medicationCarePlanAssignment.create({
      data: {
        medication_id: medication.medication_id,
        institution_id: institution.institution_id,
        resident_ids: residentIds,
        room_ids: roomIds,
        staff_ids: staffIdsForMed,
        start_date: getRandomDatePast(30),
        end_date: getRandomDateFuture(60),
        time_slot: getRandomElement([TimeSlot.morning, TimeSlot.noon, TimeSlot.afternoon, TimeSlot.evening]),
        is_active: true,
        notes: `Kế hoạch chăm sóc thuốc cho ${medication.name}`
      }
    })
  }
  console.log('✅ Created medication care plan assignments')

  // --- 13. TẠO ACTIVITIES (HOẠT ĐỘNG) ---
  console.log('🎯 Creating Activities...')
  const activitiesData: Array<{
    name: string
    description: string
    type: ActivityType
    duration: number
    maxParticipants: number
  }> = [
    {
      name: 'Tập Yoga buổi sáng',
      description: 'Tập yoga nhẹ nhàng cho người cao tuổi',
      type: ActivityType.physical_exercise,
      duration: 30,
      maxParticipants: 20
    },
    {
      name: 'Đọc sách báo',
      description: 'Hoạt động đọc sách báo, tạp chí',
      type: ActivityType.mental_activity,
      duration: 45,
      maxParticipants: 15
    },
    {
      name: 'Chơi cờ tướng',
      description: 'Chơi cờ tướng, cờ vua',
      type: ActivityType.social_interaction,
      duration: 60,
      maxParticipants: 10
    },
    {
      name: 'Vẽ tranh',
      description: 'Vẽ tranh, tô màu',
      type: ActivityType.entertainment,
      duration: 60,
      maxParticipants: 12
    },
    {
      name: 'Nghe nhạc',
      description: 'Nghe nhạc cổ điển, nhạc vàng',
      type: ActivityType.entertainment,
      duration: 45,
      maxParticipants: 25
    },
    {
      name: 'Tập dưỡng sinh',
      description: 'Tập dưỡng sinh, thái cực quyền',
      type: ActivityType.physical_exercise,
      duration: 40,
      maxParticipants: 20
    },
    {
      name: 'Thăm quan vườn',
      description: 'Đi dạo trong vườn, hít thở không khí trong lành',
      type: ActivityType.physical_exercise,
      duration: 30,
      maxParticipants: 15
    },
    {
      name: 'Xem phim',
      description: 'Xem phim tài liệu, phim cổ điển',
      type: ActivityType.entertainment,
      duration: 90,
      maxParticipants: 30
    },
    {
      name: 'Vật lý trị liệu',
      description: 'Vật lý trị liệu cho người bị đau khớp',
      type: ActivityType.therapy,
      duration: 45,
      maxParticipants: 5
    },
    {
      name: 'Lễ cầu nguyện',
      description: 'Lễ cầu nguyện cho các cụ theo đạo',
      type: ActivityType.religious_service,
      duration: 30,
      maxParticipants: 20
    }
  ]

  const createdActivities = []
  for (const act of activitiesData) {
    const activity = await prisma.activity.create({
      data: {
        institution_id: institution.institution_id,
        name: act.name,
        description: act.description,
        type: act.type,
        duration_minutes: act.duration,
        max_participants: act.maxParticipants,
        is_active: true
      }
    })
    createdActivities.push(activity)
  }
  console.log(`✅ Created ${createdActivities.length} activities`)

  // --- 14. TẠO SCHEDULES (LỊCH TRÌNH) ---
  console.log('📅 Creating Schedules...')
  const allResidentsForSchedule = await prisma.resident.findMany({ take: 30 })

  for (let i = 0; i < 40; i++) {
    const activity = getRandomElement(createdActivities)
    const resident = Math.random() > 0.3 ? getRandomElement(allResidentsForSchedule) : null
    const staff = getRandomElement(staffIds)

    const startTime = new Date()
    startTime.setDate(startTime.getDate() + getRandomInt(0, 14))
    startTime.setHours(getRandomInt(7, 18), getRandomInt(0, 59), 0, 0)

    const endTime = new Date(startTime)
    endTime.setMinutes(endTime.getMinutes() + (activity.duration_minutes || 60))

    await prisma.schedule.create({
      data: {
        activity_id: activity.activity_id,
        institution_id: institution.institution_id,
        resident_id: resident?.resident_id || null,
        staff_id: staff,
        title: `${activity.name} - ${resident ? resident.full_name : 'Hoạt động chung'}`,
        description: `Lịch trình ${activity.name}`,
        start_time: startTime,
        end_time: endTime,
        frequency: getRandomElement([ScheduleFrequency.daily, ScheduleFrequency.weekly, ScheduleFrequency.one_time]),
        is_recurring: Math.random() > 0.5,
        recurring_until: Math.random() > 0.5 ? getRandomDateFuture(90) : null,
        status: getRandomElement([ActivityStatus.planned, ActivityStatus.participated]),
        notes: 'Lịch trình đã được lên kế hoạch'
      }
    })
  }
  console.log('✅ Created schedules')

  // --- 15. TẠO EVENTS (SỰ KIỆN) ---
  console.log('🎉 Creating Events...')
  const eventData: Array<{
    name: string
    type: EventType
    subType: CareSubType
  }> = [
    { name: 'Sinh nhật tháng', type: EventType.Entertainment, subType: CareSubType.Other },
    { name: 'Khám sức khỏe định kỳ', type: EventType.Care, subType: CareSubType.VitalCheck },
    { name: 'Buổi biểu diễn văn nghệ', type: EventType.Entertainment, subType: CareSubType.Other },
    { name: 'Vật lý trị liệu nhóm', type: EventType.Care, subType: CareSubType.Therapy },
    { name: 'Lễ hội trung thu', type: EventType.Entertainment, subType: CareSubType.Other }
  ]

  for (const evt of eventData) {
    const startTime = getRandomDateFuture(30)
    const endTime = new Date(startTime)
    endTime.setHours(endTime.getHours() + getRandomInt(1, 3))

    await prisma.event.create({
      data: {
        institution_id: institution.institution_id,
        name: evt.name,
        type: evt.type,
        status: EventStatus.Upcoming,
        start_time: startTime,
        end_time: endTime,
        location: institution.name,
        room_ids: allRooms.slice(0, getRandomInt(1, 3)).map((r) => r.room_id),
        care_configuration:
          evt.type === EventType.Care
            ? {
                subType: evt.subType,
                frequency: EventFrequency.OneTime
              }
            : undefined
      }
    })
  }
  console.log('✅ Created events')

  // --- 16. TẠO VISITS (THĂM VIẾNG) ---
  console.log('👨‍👩‍👧 Creating Visits...')
  const allFamiliesForVisit = await prisma.user.findMany({
    where: { role: UserRole.Family },
    include: {
      familyResidentLinks: {
        where: { status: FamilyLinkStatus.active },
        take: 1,
        include: { resident: true }
      }
    }
  })

  for (let i = 0; i < 30; i++) {
    const family = getRandomElement(allFamiliesForVisit)
    if (family.familyResidentLinks.length === 0) continue

    const link = family.familyResidentLinks[0]
    const resident = link.resident

    const visitDate = getRandomDateFuture(14)
    const timeBlock = getRandomElement([VisitTimeBlock.morning, VisitTimeBlock.afternoon, VisitTimeBlock.evening])

    await prisma.visit.create({
      data: {
        family_user_id: family.user_id,
        resident_id: resident.resident_id,
        institution_id: institution.institution_id,
        visit_date: visitDate,
        time_block: timeBlock,
        duration: 60,
        purpose: getRandomElement([
          'Thăm hỏi sức khỏe',
          'Mang đồ ăn cho cụ',
          'Thăm hỏi định kỳ',
          'Đưa cụ đi khám bệnh'
        ]),
        notes: 'Gia đình đến thăm',
        status: getRandomElement([VisitStatus.pending, VisitStatus.approved, VisitStatus.scheduled]),
        approved_by: Math.random() > 0.5 ? getRandomElement(staffIds) : null,
        approved_at: Math.random() > 0.5 ? getRandomDatePast(7) : null
      }
    })
  }
  console.log('✅ Created visits')

  // --- 17. TẠO FEEDBACKS (PHẢN HỒI) ---
  console.log('💬 Creating Feedbacks...')
  const feedbackCategories = await prisma.feedbackCategory.findMany()
  const allFamiliesForFeedback = await prisma.user.findMany({
    where: { role: UserRole.Family },
    include: {
      familyResidentLinks: {
        where: { status: FamilyLinkStatus.active },
        take: 1
      }
    }
  })

  for (let i = 0; i < 20; i++) {
    const family = getRandomElement(allFamiliesForFeedback)
    if (family.familyResidentLinks.length === 0) continue

    const link = family.familyResidentLinks[0]
    const category = getRandomElement(feedbackCategories)

    const feedbackMessages = [
      'Dịch vụ chăm sóc rất tốt, nhân viên nhiệt tình',
      'Thực đơn đa dạng, món ăn ngon miệng',
      'Phòng ốc sạch sẽ, thoáng mát',
      'Cần cải thiện thêm về thời gian phục vụ',
      'Rất hài lòng với chất lượng dịch vụ',
      'Mong muốn có thêm hoạt động giải trí',
      'Nhân viên y tế chuyên nghiệp, tận tâm'
    ]

    await prisma.feedback.create({
      data: {
        family_user_id: family.user_id,
        resident_id: link.resident_id,
        institution_id: institution.institution_id,
        category_id: category.category_id,
        type: 'Phản hồi chung',
        message: getRandomElement(feedbackMessages),
        attachments: Math.random() > 0.7 ? [DUMMY_IMAGE_URL] : [],
        status: getRandomElement([FeedbackStatus.pending, FeedbackStatus.in_progress, FeedbackStatus.resolved]),
        assigned_staff_id: Math.random() > 0.5 ? getRandomElement(staffIds) : null,
        staff_notes: Math.random() > 0.5 ? 'Đã xử lý phản hồi' : null,
        resolved_at: Math.random() > 0.3 ? getRandomDatePast(7) : null
      }
    })
  }
  console.log('✅ Created feedbacks')

  // --- 18. TẠO SOS ALERTS (CẢNH BÁO KHẨN CẤP) ---
  console.log('🚨 Creating SOS Alerts...')
  const residentsForAlert = await prisma.resident.findMany({ take: 10 })

  for (let i = 0; i < 5; i++) {
    const resident = getRandomElement(residentsForAlert)
    const alertType = getRandomElement([SOSAlertType.fall, SOSAlertType.abnormal_vitals, SOSAlertType.emergency_button])

    await prisma.sOSAlert.create({
      data: {
        resident_id: resident.resident_id,
        institution_id: institution.institution_id,
        type: alertType,
        severity: getRandomElement([SOSAlertSeverity.high, SOSAlertSeverity.medium, SOSAlertSeverity.low]),
        status: getRandomElement([SOSAlertStatus.pending, SOSAlertStatus.acknowledged, SOSAlertStatus.resolved]),
        vital_snapshot:
          alertType === SOSAlertType.abnormal_vitals
            ? {
                bp_systolic: getRandomInt(150, 180),
                bp_diastolic: getRandomInt(90, 110),
                heart_rate: getRandomInt(100, 130),
                temperature: 38.5,
                oxygen_saturation: getRandomInt(85, 92)
              }
            : undefined,
        timer_seconds: 60,
        notes: `Cảnh báo ${alertType === SOSAlertType.fall ? 'ngã' : alertType === SOSAlertType.abnormal_vitals ? 'dấu hiệu sinh tồn bất thường' : 'nút khẩn cấp'}`,
        resolved_by_id: Math.random() > 0.5 ? getRandomElement(staffIds) : null,
        resolved_at: Math.random() > 0.5 ? getRandomDatePast(1) : null
      }
    })
  }
  console.log('✅ Created SOS alerts')

  // --- 19. TẠO INCIDENT REPORTS (BÁO CÁO SỰ CỐ) ---
  console.log('📝 Creating Incident Reports...')
  const residentsForIncident = await prisma.resident.findMany({ take: 15 })

  for (let i = 0; i < 10; i++) {
    const resident = getRandomElement(residentsForIncident)
    const incidentType = getRandomElement([
      IncidentType.fall,
      IncidentType.health_event,
      IncidentType.behavioral,
      IncidentType.environmental_hazard
    ])

    const outcomes = [
      'Đã xử lý kịp thời, cụ ổn định',
      'Đã đưa đi khám, tình trạng ổn định',
      'Đã thông báo gia đình, theo dõi tiếp',
      'Đã xử lý, không có vấn đề nghiêm trọng'
    ]

    const actionsTaken = [
      'Đã gọi bác sĩ, kiểm tra sức khỏe',
      'Đã sơ cứu, theo dõi tình trạng',
      'Đã thông báo gia đình, chuyển viện',
      'Đã xử lý tại chỗ, cụ ổn định'
    ]

    await prisma.incidentReport.create({
      data: {
        resident_id: resident.resident_id,
        institution_id: institution.institution_id,
        reported_by_id: getRandomElement(staffIds),
        incident_type: incidentType,
        root_cause: getRandomElement(['Sàn trơn trượt', 'Sức khỏe yếu', 'Thiếu chú ý', 'Thiết bị hỏng']),
        actions_taken: getRandomElement(actionsTaken),
        outcome: getRandomElement(outcomes),
        occurred_at: getRandomDatePast(30),
        staff_on_duty: `Nhân viên ${getRandomInt(1, 50)}`,
        images: Math.random() > 0.5 ? [DUMMY_IMAGE_URL] : []
      }
    })
  }
  console.log('✅ Created incident reports')

  // --- 20. TẠO RESIDENT APPLICATIONS (ĐƠN ĐĂNG KÝ) ---
  console.log('📋 Creating Resident Applications...')
  const potentialResidents = []
  for (let i = 1; i <= 10; i++) {
    const gender = Math.random() > 0.5 ? Gender.male : Gender.female
    const resName = generateName(gender)
    const birthYear = getRandomInt(1935, 1955)

    const resident = await prisma.resident.create({
      data: {
        institution_id: institution.institution_id,
        full_name: resName,
        gender: gender,
        date_of_birth: new Date(`${birthYear}-${getRandomInt(1, 12)}-${getRandomInt(1, 28)}`),
        status: ResidentStatus.inactive,
        notes: 'Đang chờ duyệt đơn đăng ký'
      }
    })
    potentialResidents.push(resident)
  }

  const familiesForApplication = await prisma.user.findMany({
    where: { role: UserRole.Family },
    take: 10
  })

  for (let i = 0; i < 10; i++) {
    const resident = potentialResidents[i]
    const family = i < familiesForApplication.length ? familiesForApplication[i] : null

    await prisma.residentApplication.create({
      data: {
        resident_id: resident.resident_id,
        institution_id: institution.institution_id,
        family_user_id: family?.user_id || null,
        appointment_date: getRandomDateFuture(30),
        status: getRandomElement([
          ResidentAssessmentStatus.pending,
          ResidentAssessmentStatus.completed,
          ResidentAssessmentStatus.joined
        ])
      }
    })
  }
  console.log('✅ Created resident applications')

  // --- 11. TẠO CONTRACT VÀ PAYMENT TEST ĐỂ CÓ THỂ THANH TOÁN NGAY ---
  console.log('🧪 Creating test contract for immediate payment...')

  // Lấy một family user và resident để tạo contract test
  const testFamily = await prisma.user.findFirst({
    where: { role: UserRole.Family },
    include: {
      familyResidentLinks: {
        where: { status: FamilyLinkStatus.active },
        take: 1,
        include: {
          resident: true
        }
      }
    }
  })

  if (testFamily && testFamily.familyResidentLinks.length > 0) {
    const testResident = testFamily.familyResidentLinks[0].resident

    // Kiểm tra xem đã có contract chưa
    const existingContract = await prisma.serviceContract.findUnique({
      where: { resident_id: testResident.resident_id }
    })

    if (existingContract) {
      // Cập nhật next_billing_date về quá khứ để có thể thanh toán ngay
      await prisma.serviceContract.update({
        where: { contract_id: existingContract.contract_id },
        data: {
          next_billing_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 ngày trước
        }
      })
      console.log(`✅ Updated test contract for resident: ${testResident.full_name}`)
      console.log(`   Contract ID: ${existingContract.contract_id}`)
      console.log(`   Family Email: ${testFamily.email}`)
      console.log(`   Next Billing Date: ${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN')}`)
    }
  }

  console.log('✅ SEEDING COMPLETED SUCCESSFULLY!')
  console.log('=============================================')
  console.log('🔑 CREDENTIALS SUMMARY (Password: Mk@01234567890):')
  console.log('- Platform Admin: superadmin@helicare.vn')
  console.log('- Institution Root: manager@helicare.vn')
  console.log('- Inst Admin: admin1@... -> admin10@helicare.vn')
  console.log('- Nurses: nurse1@... -> nurse50@helicare.vn')
  console.log('- Caregivers: caregiver1@... -> caregiver50@helicare.vn')
  console.log('- Doctors: doctor1@... -> doctor20@helicare.vn')
  console.log('- Families: family1@... -> family50@gmail.com')
  console.log('=============================================')
  console.log('💰 MOCK BANK ACCOUNTS:')
  console.log('- Mỗi Family/Resident user có 100 triệu VND trong tài khoản mock')
  console.log('- Tài khoản tự động được tạo khi seed')
  console.log('=============================================')
  console.log('🧪 TEST PAYMENT FLOW:')
  if (testFamily && testFamily.familyResidentLinks.length > 0) {
    console.log(`- Login với: ${testFamily.email}`)
    console.log(`- Vào trang thanh toán cho resident: ${testFamily.familyResidentLinks[0].resident.full_name}`)
    console.log('- Nhấn "Thanh toán VNPay" → Sẽ redirect đến VNPay sandbox')
    console.log('- Sau khi thanh toán thành công → Tiền sẽ bị trừ từ tài khoản mock')
  }
  console.log('=============================================')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
