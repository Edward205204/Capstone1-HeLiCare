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
  VisitStatus,
  FamilyLinkStatus,
  CorrectionSourceType
} from '@prisma/client'
import { hashPassword } from '../src/utils/hash'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seeding process...')

  // --- 0. CLEANUP (Xóa dữ liệu cũ theo thứ tự ràng buộc khóa ngoại) ---
  // Lưu ý: Trong môi trường dev, bạn có thể dùng prisma migrate reset để nhanh hơn
  // Nhưng đây là cách an toàn nếu chạy seed thủ công.
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
    console.log('⚠️ Could not truncate tables, attempting to seed on top...')
  }

  const pwData = await hashPassword('Mk@01234567890')
  const passwordHash = pwData.password
  // --- 1. SUPER ADMIN ---
  await prisma.user.create({
    data: {
      email: 'superadmin@helincare.vn',
      password: passwordHash,
      role: UserRole.PlatformSuperAdmin,
      status: UserStatus.active
    }
  })
  console.log('👤 Created Super Admin')

  // --- 2. INSTITUTION & CONFIGURATION ---
  const institution = await prisma.institution.create({
    data: {
      name: 'Viện Dưỡng Lão An Khang',
      address: {
        province: 'Đà Nẵng',
        district: 'Ngũ Hành Sơn',
        ward: 'Hòa Quý',
        street: 'Nam Kỳ Khởi Nghĩa',
        detail: 'Khu Đô Thị FPT City'
      },
      contact_info: {
        phone: '0236.999.888',
        email: 'contact@ankhang.vn',
        website: 'https://ankhang.helincare.vn'
      },
      status: InstitutionContractStatus.active,
      // Tạo luôn Settings đi kèm
      visitConfiguration: {
        create: {
          max_visitors_per_day: 50,
          max_visitors_per_slot: 10,
          advance_booking_days: 7,
          cancellation_hours: 24
        }
      },
      adminSetting: {
        create: {
          toggles: { allow_guest_wifi: true, night_mode_camera: true },
          email_templates: { welcome: 'Chào mừng gia đình...' }
        }
      },
      // Tạo Feedback Categories mặc định
      feedbackCategories: {
        createMany: {
          data: [
            { name: 'Chất lượng dịch vụ', description: 'Thái độ nhân viên, quy trình...', is_active: true },
            { name: 'Cơ sở vật chất', description: 'Phòng ốc, thiết bị hư hỏng...', is_active: true },
            { name: 'Y tế & Sức khỏe', description: 'Thuốc men, bệnh án...', is_active: true }
          ]
        }
      },
      // Tạo Visit Time Slots
      visitTimeSlots: {
        createMany: {
          data: [
            { name: 'Sáng (08:00 - 11:00)', start_time: '08:00', end_time: '11:00' },
            { name: 'Chiều (14:00 - 17:00)', start_time: '14:00', end_time: '17:00' }
          ]
        }
      }
    }
  })
  console.log(`🏥 Created Institution: ${institution.name}`)

  // --- 3. ROOMS ---
  // Tạo 3 phòng: 1 Single (VIP), 1 Double, 1 Multi (4 người)
  const roomVip = await prisma.room.create({
    data: {
      institution_id: institution.institution_id,
      room_number: '101',
      type: RoomType.single,
      capacity: 1,
      current_occupancy: 0,
      is_available: true,
      notes: 'Phòng VIP view biển, đầy đủ tiện nghi'
    }
  })

  const roomDouble = await prisma.room.create({
    data: {
      institution_id: institution.institution_id,
      room_number: '102',
      type: RoomType.double,
      capacity: 2,
      current_occupancy: 0,
      is_available: true,
      notes: 'Phòng đôi tiêu chuẩn'
    }
  })

  const roomMulti = await prisma.room.create({
    data: {
      institution_id: institution.institution_id,
      room_number: '103',
      type: RoomType.multi,
      capacity: 4,
      current_occupancy: 0,
      is_available: true,
      notes: 'Phòng sinh hoạt chung 4 giường'
    }
  })
  console.log('🛏️ Created Rooms')

  // --- 4. STAFF USERS ---
  // 4.1. Admin Viện
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ankhang.vn',
      password: passwordHash,
      role: UserRole.Admin,
      status: UserStatus.active,
      institution_id: institution.institution_id,
      staffProfile: {
        create: {
          institution_id: institution.institution_id,
          full_name: 'Trần Quản Lý',
          phone: '0905111222',
          position: StaffPosition.OTHER, // Hoặc tạo enum MANAGER nếu cần
          hire_date: new Date('2020-01-01')
        }
      }
    }
  })

  // 4.2. Y tá trưởng (Head Nurse)
  const nurseUser = await prisma.user.create({
    data: {
      email: 'nurse@ankhang.vn',
      password: passwordHash,
      role: UserRole.Staff,
      status: UserStatus.active,
      institution_id: institution.institution_id,
      staffProfile: {
        create: {
          institution_id: institution.institution_id,
          full_name: 'Nguyễn Thị Y Tá',
          phone: '0905333444',
          position: StaffPosition.NURSE,
          hire_date: new Date('2021-05-15')
        }
      }
    }
  })

  // 4.3. Bác sĩ (Physician)
  const doctorUser = await prisma.user.create({
    data: {
      email: 'doctor@ankhang.vn',
      password: passwordHash,
      role: UserRole.Staff,
      status: UserStatus.active,
      institution_id: institution.institution_id,
      staffProfile: {
        create: {
          institution_id: institution.institution_id,
          full_name: 'Dr. Lê Văn Bác',
          phone: '0905555666',
          position: StaffPosition.PHYSICIAN,
          hire_date: new Date('2022-01-10')
        }
      }
    }
  })
  console.log('👩‍⚕️ Created Staff Users')

  // --- 5. RESIDENTS ---
  // Resident 1: Cụ Ông A (Khỏe mạnh, phòng VIP)
  const residentA = await prisma.resident.create({
    data: {
      institution_id: institution.institution_id,
      room_id: roomVip.room_id,
      assigned_staff_id: nurseUser.user_id,
      full_name: 'Nguyễn Văn Cụ A',
      gender: Gender.male,
      date_of_birth: new Date('1945-05-20'),
      status: ResidentStatus.active,
      admission_date: new Date('2024-01-01'),
      height_cm: 170,
      weight_kg: 65,
      bmi: 22.5,
      notes: 'Thích đọc sách, không ăn cay.',
      chronicDiseases: {
        create: [{ name: 'Cao huyết áp nhẹ', status: 'ACTIVE', severity: 'MILD' }]
      }
    }
  })
  // Update Room Occupancy
  await prisma.room.update({
    where: { room_id: roomVip.room_id },
    data: { current_occupancy: 1, is_available: false }
  })

  // Resident 2: Cụ Bà B (Tiểu đường, phòng đôi)
  const residentB = await prisma.resident.create({
    data: {
      institution_id: institution.institution_id,
      room_id: roomDouble.room_id,
      assigned_staff_id: nurseUser.user_id,
      full_name: 'Lê Thị Cụ B',
      gender: Gender.female,
      date_of_birth: new Date('1950-10-10'),
      status: ResidentStatus.active,
      admission_date: new Date('2024-06-15'),
      height_cm: 155,
      weight_kg: 60,
      bmi: 24.9,
      chronicDiseases: {
        create: [{ name: 'Tiểu đường Type 2', status: 'ACTIVE', severity: 'MODERATE' }]
      },
      dietTags: {
        create: [
          { tag_type: DietTagType.LowSugar, tag_name: 'Ít đường', source_type: 'Medical Record' },
          { tag_type: DietTagType.SoftTexture, tag_name: 'Cơm mềm', source_type: 'Preference' }
        ]
      }
    }
  })
  await prisma.room.update({
    where: { room_id: roomDouble.room_id },
    data: { current_occupancy: 1 }
  })
  console.log('👴👵 Created Residents')

  // --- 6. FAMILY & LINKS ---
  const familyUser = await prisma.user.create({
    data: {
      email: 'familyA@gmail.com',
      password: passwordHash,
      role: UserRole.Family,
      status: UserStatus.active,
      familyProfile: {
        create: {
          full_name: 'Nguyễn Con Trai',
          phone: '0912345678',
          address: 'Hà Nội'
        }
      }
    }
  })

  await prisma.familyResidentLink.create({
    data: {
      family_user_id: familyUser.user_id,
      resident_id: residentA.resident_id,
      institution_id: institution.institution_id,
      family_email: 'familyA@gmail.com',
      status: FamilyLinkStatus.active
    }
  })
  console.log('👨‍👩‍👧 Created Family Link')

  // --- 7. MEDICATIONS ---
  const medInsulin = await prisma.medication.create({
    data: {
      institution_id: institution.institution_id,
      name: 'Insulin Glargine',
      dosage: '10 units',
      form: MedicationForm.injection,
      frequency: 'Mỗi tối',
      timing: MedicationTiming.any_time,
      is_active: true
    }
  })

  const medPanadol = await prisma.medication.create({
    data: {
      institution_id: institution.institution_id,
      name: 'Panadol Extra',
      dosage: '500mg',
      form: MedicationForm.tablet,
      frequency: 'Khi đau',
      timing: MedicationTiming.after_meal,
      is_active: true
    }
  })

  // Assign Insulin cho Cụ B
  await prisma.medicationCarePlanAssignment.create({
    data: {
      institution_id: institution.institution_id,
      medication_id: medInsulin.medication_id,
      resident_ids: [residentB.resident_id],
      start_date: new Date(),
      is_active: true,
      notes: 'Tiêm dưới da trước khi ngủ'
    }
  })
  console.log('💊 Created Medications')

  // --- 8. KITCHEN: Ingredients, Dishes, Menu ---
  const ingRice = await prisma.ingredient.create({
    data: {
      institution_id: institution.institution_id,
      name: 'Gạo tẻ',
      unit: IngredientUnit.g,
      calories_per_100g: 130
    }
  })
  const ingChicken = await prisma.ingredient.create({
    data: {
      institution_id: institution.institution_id,
      name: 'Ức gà',
      unit: IngredientUnit.g,
      calories_per_100g: 165,
      protein_per_100g: 31
    }
  })

  const dishChickenRice = await prisma.dish.create({
    data: {
      institution_id: institution.institution_id,
      name: 'Cơm gà xé',
      calories_per_100g: 150,
      texture: DishTexture.Regular,
      dishIngredients: {
        create: [
          { ingredient_id: ingRice.ingredient_id, amount: 200 },
          { ingredient_id: ingChicken.ingredient_id, amount: 100 }
        ]
      }
    }
  })

  const dishPorridge = await prisma.dish.create({
    data: {
      institution_id: institution.institution_id,
      name: 'Cháo gà đậu xanh',
      calories_per_100g: 80,
      texture: DishTexture.Pureed, // Dành cho người khó nuốt
      dishIngredients: {
        create: [
          { ingredient_id: ingRice.ingredient_id, amount: 50 },
          { ingredient_id: ingChicken.ingredient_id, amount: 50 }
        ]
      }
    }
  })

  // Menu tuần này
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(monday.getDate() - monday.getDay() + 1) // Thứ 2 tuần này

  await prisma.weeklyMenu.create({
    data: {
      institution_id: institution.institution_id,
      week_start_date: monday,
      week_end_date: new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000),
      created_by_id: adminUser.user_id,
      menuItems: {
        create: [
          {
            dish_id: dishChickenRice.dish_id,
            day_of_week: 1, // Thứ 2
            meal_slot: MealSlot.Lunch,
            servings: 50
          },
          {
            dish_id: dishPorridge.dish_id,
            day_of_week: 1, // Thứ 2
            meal_slot: MealSlot.Dinner,
            servings: 50
          }
        ]
      }
    }
  })
  console.log('🍳 Created Kitchen Data')

  // --- 9. SCHEDULE & OPERATIONS ---
  // Tạo sự kiện "Đo sinh hiệu sáng"
  const eventVital = await prisma.event.create({
    data: {
      institution_id: institution.institution_id,
      name: 'Đo sinh hiệu buổi sáng',
      type: EventType.Care,
      status: EventStatus.Upcoming,
      start_time: new Date(new Date().setHours(7, 0, 0, 0)),
      end_time: new Date(new Date().setHours(8, 0, 0, 0)),
      location: 'Tại phòng',
      care_configuration: {
        subType: CareSubType.VitalCheck,
        frequency: EventFrequency.Daily
      }
    }
  })

  // Log chăm sóc đã hoàn thành cho cụ A
  await prisma.careLog.create({
    data: {
      institution_id: institution.institution_id,
      resident_id: residentA.resident_id,
      staff_id: nurseUser.user_id,
      type: CareLogType.medication,
      title: 'Uống thuốc Vitamin sáng',
      start_time: new Date(new Date().setHours(8, 0, 0, 0)),
      status: CareTaskStatus.completed,
      medication_name: 'Multivitamin',
      medication_status: 'administered',
      notes: 'Cụ vui vẻ hợp tác'
    }
  })
  console.log('📅 Created Schedule & Logs')

  // --- 10. BILLING ---
  const contract = await prisma.serviceContract.create({
    data: {
      resident_id: residentA.resident_id,
      institution_id: institution.institution_id,
      billing_cycle: BillingCycle.MONTHLY,
      amount: 15000000, // 15 triệu/tháng
      start_date: new Date('2024-01-01'),
      next_billing_date: new Date('2025-01-01'),
      is_active: true
    }
  })

  await prisma.payment.create({
    data: {
      contract_id: contract.contract_id,
      amount: 15000000,
      payment_method: PaymentMethod.TRANSFER,
      status: PaymentStatus.SUCCESS,
      transaction_ref: 'BANK123456',
      period_start: new Date('2024-12-01'),
      period_end: new Date('2024-12-31'),
      verified_by_id: adminUser.user_id
    }
  })
  console.log('💰 Created Billing Data')

  // --- 11. FEEDBACK & INCIDENTS ---
  await prisma.feedback.create({
    data: {
      institution_id: institution.institution_id,
      family_user_id: familyUser.user_id,
      resident_id: residentA.resident_id,
      category_id: (
        await prisma.feedbackCategory.findFirstOrThrow({ where: { institution_id: institution.institution_id } })
      ).category_id,
      message: 'Cảm ơn các cô y tá đã chăm sóc ba tôi rất tốt.',
      status: FeedbackStatus.resolved,
      resolved_at: new Date()
    }
  })

  await prisma.incidentReport.create({
    data: {
      institution_id: institution.institution_id,
      resident_id: residentB.resident_id,
      reported_by_id: nurseUser.user_id,
      incident_type: 'fall',
      root_cause: 'Sàn nhà ướt',
      actions_taken: 'Đã sơ cứu, kiểm tra không có chấn thương nghiêm trọng',
      outcome: 'Ổn định',
      occurred_at: new Date(new Date().getTime() - 86400000)
    }
  })

  console.log('📝 Created Feedback & Incidents')
  console.log('✅ Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
