import { prisma } from '~/utils/db'
import { DietTagType } from '@prisma/client'

/**
 * Diet Tag Service
 * Auto-assigns diet tags to residents based on:
 * - Vital Signs (HealthAssessment)
 * - Medical Records (ChronicDisease, Allergy)
 * - Cognitive/Mobility status
 */
export class DietTagService {
  // Thresholds for auto-tagging
  private readonly GLUCOSE_THRESHOLD_HIGH = 140 // mg/dL
  private readonly GLUCOSE_THRESHOLD_LOW = 70 // mg/dL
  private readonly BLOOD_PRESSURE_HIGH_SYSTOLIC = 140 // mmHg
  private readonly BLOOD_PRESSURE_HIGH_DIASTOLIC = 90 // mmHg

  /**
   * Auto-assign diet tags for a resident based on latest vital signs and medical records
   */
  async autoAssignDietTags(resident_id: string): Promise<void> {
    const resident = await prisma.resident.findUnique({
      where: { resident_id },
      include: {
        chronicDiseases: {
          where: {
            status: 'ACTIVE'
          }
        },
        allergies: true,
        healthAssessments: {
          orderBy: {
            measured_at: 'desc'
          },
          take: 1 // Latest assessment
        }
      }
    })

    if (!resident) {
      throw new Error('Resident not found')
    }

    const tagsToAssign: Array<{
      tag_type: DietTagType
      tag_name: string
      source_type: string
      source_id?: string
      notes?: string
    }> = []

    // 1. Check Chronic Diseases
    for (const disease of resident.chronicDiseases || []) {
      const diseaseName = disease.name.toLowerCase()

      // Diabetes / Đái tháo đường
      if (
        diseaseName.includes('diabetes') ||
        diseaseName.includes('đái tháo đường') ||
        diseaseName.includes('tiểu đường')
      ) {
        tagsToAssign.push({
          tag_type: DietTagType.LowSugar,
          tag_name: 'Low Sugar',
          source_type: 'medical_record',
          source_id: disease.id,
          notes: `Auto-assigned from chronic disease: ${disease.name}`
        })
      }

      // Hypertension / Tăng huyết áp
      if (
        diseaseName.includes('hypertension') ||
        diseaseName.includes('tăng huyết áp') ||
        diseaseName.includes('huyết áp cao')
      ) {
        tagsToAssign.push({
          tag_type: DietTagType.LowSodium,
          tag_name: 'Low Sodium',
          source_type: 'medical_record',
          source_id: disease.id,
          notes: `Auto-assigned from chronic disease: ${disease.name}`
        })
      }

      // Dysphagia / Khó nuốt
      if (
        diseaseName.includes('dysphagia') ||
        diseaseName.includes('khó nuốt') ||
        diseaseName.includes('rối loạn nuốt')
      ) {
        tagsToAssign.push({
          tag_type: DietTagType.SoftTexture,
          tag_name: 'Soft Texture',
          source_type: 'medical_record',
          source_id: disease.id,
          notes: `Auto-assigned from chronic disease: ${disease.name}`
        })
      }
    }

    // 2. Check Allergies
    for (const allergy of resident.allergies || []) {
      const substance = allergy.substance.toLowerCase()

      // Gluten allergy
      if (substance.includes('gluten') || substance.includes('lúa mì')) {
        tagsToAssign.push({
          tag_type: DietTagType.GlutenFree,
          tag_name: 'Gluten Free',
          source_type: 'medical_record',
          source_id: allergy.id,
          notes: `Auto-assigned from allergy: ${allergy.substance}`
        })
      }

      // Lactose allergy
      if (
        substance.includes('lactose') ||
        substance.includes('sữa') ||
        substance.includes('milk') ||
        substance.includes('dairy')
      ) {
        tagsToAssign.push({
          tag_type: DietTagType.LactoseFree,
          tag_name: 'Lactose Free',
          source_type: 'medical_record',
          source_id: allergy.id,
          notes: `Auto-assigned from allergy: ${allergy.substance}`
        })
      }
    }

    // 3. Check Latest Vital Signs
    const latestAssessment = resident.healthAssessments?.[0]
    if (latestAssessment) {
      // Check glucose (if available in notes or future field)
      // Note: Currently glucose is not in HealthAssessment schema
      // This is a placeholder for future enhancement

      // Check blood pressure for hypertension
      if (latestAssessment.blood_pressure_systolic && latestAssessment.blood_pressure_diastolic) {
        if (
          latestAssessment.blood_pressure_systolic >= this.BLOOD_PRESSURE_HIGH_SYSTOLIC ||
          latestAssessment.blood_pressure_diastolic >= this.BLOOD_PRESSURE_HIGH_DIASTOLIC
        ) {
          // Only add if not already assigned from chronic disease
          const hasLowSodium = tagsToAssign.some((t) => t.tag_type === DietTagType.LowSodium)
          if (!hasLowSodium) {
            tagsToAssign.push({
              tag_type: DietTagType.LowSodium,
              tag_name: 'Low Sodium',
              source_type: 'vital_sign',
              source_id: latestAssessment.assessment_id,
              notes: `Auto-assigned from high blood pressure: ${latestAssessment.blood_pressure_systolic}/${latestAssessment.blood_pressure_diastolic} mmHg`
            })
          }
        }
      }

      // Check cognitive/mobility status for texture requirements
      if (latestAssessment.cognitive_status === 'SEVERE' || latestAssessment.mobility_status === 'DEPENDENT') {
        // Check if soft texture already assigned
        const hasSoftTexture = tagsToAssign.some((t) => t.tag_type === DietTagType.SoftTexture)
        if (!hasSoftTexture) {
          tagsToAssign.push({
            tag_type: DietTagType.SoftTexture,
            tag_name: 'Soft Texture',
            source_type: 'vital_sign',
            source_id: latestAssessment.assessment_id,
            notes: `Auto-assigned from cognitive/mobility status: ${latestAssessment.cognitive_status}/${latestAssessment.mobility_status}`
          })
        }
      }
    }

    // 4. Apply tags in transaction
    await prisma.$transaction(async (tx) => {
      for (const tag of tagsToAssign) {
        // Upsert: update if exists, create if not
        await tx.residentDietTag.upsert({
          where: {
            resident_id_tag_type: {
              resident_id,
              tag_type: tag.tag_type
            }
          },
          update: {
            tag_name: tag.tag_name,
            source_type: tag.source_type,
            source_id: tag.source_id,
            notes: tag.notes,
            is_active: true,
            assigned_at: new Date()
          },
          create: {
            resident_id: resident_id,
            tag_type: tag.tag_type,
            tag_name: tag.tag_name,
            source_type: tag.source_type,
            source_id: tag.source_id,
            notes: tag.notes,
            is_active: true
          }
        })
      }
    })
  }

  /**
   * Get active diet tags for a resident
   */
  async getResidentDietTags(resident_id: string): Promise<any[]> {
    return prisma.residentDietTag.findMany({
      where: {
        resident_id,
        is_active: true,
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }]
      },
      orderBy: {
        assigned_at: 'desc'
      }
    })
  }

  /**
   * Get all residents with a specific diet tag
   */
  async getResidentsByDietTag(institution_id: string, tag_type: DietTagType): Promise<any[]> {
    return prisma.resident.findMany({
      where: {
        institution_id,
        dietTags: {
          some: {
            tag_type,
            is_active: true,
            OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }]
          }
        }
      },
      include: {
        dietTags: {
          where: {
            tag_type,
            is_active: true
          }
        }
      }
    })
  }

  /**
   * Manually override a diet tag (for exceptions)
   */
  async overrideDietTag(resident_id: string, tag_type: DietTagType, tag_name: string, notes?: string): Promise<void> {
    await prisma.residentDietTag.upsert({
      where: {
        resident_id_tag_type: {
          resident_id,
          tag_type
        }
      },
      update: {
        tag_name,
        source_type: 'manual_override',
        source_id: null,
        notes,
        is_active: true,
        assigned_at: new Date()
      },
      create: {
        resident_id,
        tag_type,
        tag_name,
        source_type: 'manual_override',
        source_id: null,
        notes,
        is_active: true
      }
    })
  }

  /**
   * Remove a diet tag
   */
  async removeDietTag(resident_id: string, tag_type: DietTagType): Promise<void> {
    await prisma.residentDietTag.updateMany({
      where: {
        resident_id,
        tag_type
      },
      data: {
        is_active: false
      }
    })
  }

  /**
   * Re-evaluate all residents' diet tags (batch operation)
   */
  async reEvaluateAllResidents(institution_id: string): Promise<void> {
    const residents = await prisma.resident.findMany({
      where: {
        institution_id
      },
      select: {
        resident_id: true
      }
    })

    for (const resident of residents) {
      try {
        await this.autoAssignDietTags(resident.resident_id)
      } catch (error) {
        console.error(`Error auto-assigning tags for resident ${resident.resident_id}:`, error)
        // Continue with other residents
      }
    }
  }
}

export const dietTagService = new DietTagService()
