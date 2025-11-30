import { Medication, Prisma } from '@prisma/client'
import { prisma } from '~/utils/db'
import {
  CreateMedicationDto,
  UpdateMedicationDto,
  CreateMedicationCarePlanDto,
  UpdateMedicationCarePlanDto,
  GetMedicationsQueryParams,
  GetCarePlansQueryParams,
  GetAssignedMedicationsQueryParams,
  MedicationResponse,
  MedicationCarePlanResponse,
  AssignedMedicationResponse,
  AlertResponse
} from './medication-careplan.dto'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'

export class MedicationCarePlanService {
  // ========== MEDICATION CRUD ==========

  async createMedication(institution_id: string, data: CreateMedicationDto): Promise<Medication> {
    return await prisma.medication.create({
      data: {
        institution_id,
        ...data
      }
    })
  }

  async getMedications(
    institution_id: string,
    params: GetMedicationsQueryParams = {}
  ): Promise<{ data: MedicationResponse[]; total: number }> {
    const { take = 50, skip = 0, search, is_active } = params

    const where: Prisma.MedicationWhereInput = {
      institution_id
    }

    if (is_active !== undefined) {
      where.is_active = is_active
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { dosage: { contains: search, mode: 'insensitive' } },
        { frequency: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [medications, total] = await Promise.all([
      prisma.medication.findMany({
        where,
        take,
        skip,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: {
              assignments: {
                where: {
                  is_active: true
                }
              }
            }
          }
        }
      }),
      prisma.medication.count({ where })
    ])

    const data: MedicationResponse[] = medications.map((med) => ({
      medication_id: med.medication_id,
      institution_id: med.institution_id,
      name: med.name,
      dosage: med.dosage,
      form: String(med.form),
      frequency: med.frequency,
      timing: String(med.timing),
      instructions: med.instructions || undefined,
      is_active: med.is_active,
      created_at: med.created_at,
      updated_at: med.updated_at,
      assignments_count: med._count.assignments
    }))

    return { data, total }
  }

  async getMedicationById(institution_id: string, medication_id: string): Promise<Medication | null> {
    return await prisma.medication.findFirst({
      where: {
        medication_id,
        institution_id
      }
    })
  }

  async updateMedication(institution_id: string, medication_id: string, data: UpdateMedicationDto) {
    const medication = await this.getMedicationById(institution_id, medication_id)
    if (!medication) {
      throw new ErrorWithStatus({
        message: 'Medication not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return await prisma.medication.update({
      where: { medication_id },
      data
    })
  }

  async deleteMedication(institution_id: string, medication_id: string): Promise<void> {
    const medication = await this.getMedicationById(institution_id, medication_id)
    if (!medication) {
      throw new ErrorWithStatus({
        message: 'Medication not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Check if there are active assignments
    const activeAssignments = await prisma.medicationCarePlanAssignment.count({
      where: {
        medication_id,
        institution_id,
        is_active: true
      }
    })

    if (activeAssignments > 0) {
      throw new ErrorWithStatus({
        message: 'Cannot delete medication with active care plan assignments',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    await prisma.medication.delete({
      where: { medication_id }
    })
  }

  // ========== CARE PLAN ASSIGNMENTS ==========

  async createMedicationCarePlan(institution_id: string, data: CreateMedicationCarePlanDto) {
    // Validate medication exists and belongs to institution
    const medication = await this.getMedicationById(institution_id, data.medication_id)
    if (!medication) {
      throw new ErrorWithStatus({
        message: 'Medication not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Validate residents exist and belong to institution
    if (data.resident_ids && data.resident_ids.length > 0) {
      const residents = await prisma.resident.findMany({
        where: {
          resident_id: { in: data.resident_ids },
          institution_id
        },
        select: { resident_id: true }
      })

      if (residents.length !== data.resident_ids.length) {
        throw new ErrorWithStatus({
          message: 'One or more residents not found or do not belong to this institution',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    // Validate rooms exist and belong to institution
    if (data.room_ids && data.room_ids.length > 0) {
      const rooms = await prisma.room.findMany({
        where: {
          room_id: { in: data.room_ids },
          institution_id
        },
        select: { room_id: true }
      })

      if (rooms.length !== data.room_ids.length) {
        throw new ErrorWithStatus({
          message: 'One or more rooms not found or do not belong to this institution',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    // Validate staff exist and belong to institution
    if (data.staff_ids && data.staff_ids.length > 0) {
      const staff = await prisma.user.findMany({
        where: {
          user_id: { in: data.staff_ids },
          institution_id,
          role: 'Staff'
        },
        select: { user_id: true }
      })

      if (staff.length !== data.staff_ids.length) {
        throw new ErrorWithStatus({
          message: 'One or more staff members not found or do not belong to this institution',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    // Validate at least one assignment target
    if (
      (!data.resident_ids || data.resident_ids.length === 0) &&
      (!data.room_ids || data.room_ids.length === 0) &&
      (!data.staff_ids || data.staff_ids.length === 0)
    ) {
      throw new ErrorWithStatus({
        message: 'At least one assignment target (resident, room, or staff) is required',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // ACID-safe transaction
    return await prisma.$transaction(async (tx) => {
      const assignment = await tx.medicationCarePlanAssignment.create({
        data: {
          medication_id: data.medication_id,
          institution_id,
          resident_ids: data.resident_ids || [],
          room_ids: data.room_ids || [],
          staff_ids: data.staff_ids || [],
          start_date: new Date(data.start_date),
          end_date: data.end_date ? new Date(data.end_date) : null,
          time_slot: data.time_slot || null,
          notes: data.notes || null
        }
      })

      return assignment
    })
  }

  async getCarePlans(
    institution_id: string,
    params: GetCarePlansQueryParams = {}
  ): Promise<{ data: MedicationCarePlanResponse[]; total: number }> {
    const { take = 50, skip = 0, medication_id, resident_id, room_id, staff_id, is_active } = params

    const where: Prisma.MedicationCarePlanAssignmentWhereInput = {
      institution_id
    }

    if (medication_id) {
      where.medication_id = medication_id
    }

    if (resident_id) {
      where.resident_ids = { has: resident_id }
    }

    if (room_id) {
      where.room_ids = { has: room_id }
    }

    if (staff_id) {
      where.staff_ids = { has: staff_id }
    }

    if (is_active !== undefined) {
      where.is_active = is_active
    }

    const [assignments, total] = await Promise.all([
      prisma.medicationCarePlanAssignment.findMany({
        where,
        take,
        skip,
        orderBy: { created_at: 'desc' },
        include: {
          medication: {
            select: {
              medication_id: true,
              name: true,
              dosage: true,
              form: true,
              frequency: true,
              timing: true
            }
          }
        }
      }),
      prisma.medicationCarePlanAssignment.count({ where })
    ])

    // Fetch related data for each assignment
    const data: MedicationCarePlanResponse[] = await Promise.all(
      assignments.map(async (assignment) => {
        const [residents, rooms, staff] = await Promise.all([
          assignment.resident_ids.length > 0
            ? prisma.resident.findMany({
                where: {
                  resident_id: { in: assignment.resident_ids },
                  institution_id
                },
                select: {
                  resident_id: true,
                  full_name: true,
                  allergies: {
                    select: {
                      id: true,
                      substance: true,
                      severity: true
                    }
                  },
                  dietTags: {
                    where: { is_active: true },
                    select: {
                      tag_id: true,
                      tag_type: true,
                      tag_name: true
                    }
                  }
                }
              })
            : [],
          assignment.room_ids.length > 0
            ? prisma.room.findMany({
                where: {
                  room_id: { in: assignment.room_ids },
                  institution_id
                },
                select: {
                  room_id: true,
                  room_number: true,
                  type: true,
                  capacity: true
                }
              })
            : [],
          assignment.staff_ids.length > 0
            ? prisma.user.findMany({
                where: {
                  user_id: { in: assignment.staff_ids },
                  institution_id
                },
                select: {
                  user_id: true,
                  email: true,
                  staffProfile: {
                    select: {
                      full_name: true,
                      position: true
                    }
                  }
                }
              })
            : []
        ])

        return {
          assignment_id: assignment.assignment_id,
          medication_id: assignment.medication_id,
          institution_id: assignment.institution_id,
          resident_ids: assignment.resident_ids,
          room_ids: assignment.room_ids,
          staff_ids: assignment.staff_ids,
          start_date: assignment.start_date,
          end_date: assignment.end_date || undefined,
          is_active: assignment.is_active,
          notes: assignment.notes || undefined,
          created_at: assignment.created_at,
          updated_at: assignment.updated_at,
          medication: assignment.medication
            ? {
                medication_id: assignment.medication.medication_id,
                name: assignment.medication.name,
                dosage: assignment.medication.dosage,
                form: String(assignment.medication.form),
                frequency: assignment.medication.frequency,
                timing: String(assignment.medication.timing)
              }
            : undefined,
          residents:
            residents.length > 0
              ? residents.map((r) => ({
                  resident_id: r.resident_id,
                  full_name: r.full_name,
                  allergies: r.allergies.map((a) => ({
                    id: a.id,
                    substance: a.substance,
                    severity: a.severity ? String(a.severity) : undefined
                  })),
                  dietTags: r.dietTags.map((dt) => ({
                    tag_id: dt.tag_id,
                    tag_type: String(dt.tag_type),
                    tag_name: dt.tag_name
                  }))
                }))
              : undefined,
          rooms: rooms.length > 0 ? rooms : undefined,
          staff:
            staff.length > 0
              ? staff.map((s) => ({
                  user_id: s.user_id,
                  email: s.email,
                  staffProfile: s.staffProfile
                    ? {
                        full_name: s.staffProfile.full_name,
                        position: String(s.staffProfile.position)
                      }
                    : undefined
                }))
              : undefined,
          time_slot: assignment.time_slot ? String(assignment.time_slot) : undefined
        }
      })
    )

    return { data, total }
  }

  async updateMedicationCarePlan(institution_id: string, assignment_id: string, data: UpdateMedicationCarePlanDto) {
    const assignment = await prisma.medicationCarePlanAssignment.findFirst({
      where: {
        assignment_id,
        institution_id
      }
    })

    if (!assignment) {
      throw new ErrorWithStatus({
        message: 'Care plan assignment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // Validate residents if provided
    if (data.resident_ids && data.resident_ids.length > 0) {
      const residents = await prisma.resident.findMany({
        where: {
          resident_id: { in: data.resident_ids },
          institution_id
        },
        select: { resident_id: true }
      })

      if (residents.length !== data.resident_ids.length) {
        throw new ErrorWithStatus({
          message: 'One or more residents not found or do not belong to this institution',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    // Validate rooms if provided
    if (data.room_ids && data.room_ids.length > 0) {
      const rooms = await prisma.room.findMany({
        where: {
          room_id: { in: data.room_ids },
          institution_id
        },
        select: { room_id: true }
      })

      if (rooms.length !== data.room_ids.length) {
        throw new ErrorWithStatus({
          message: 'One or more rooms not found or do not belong to this institution',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    // Validate staff if provided
    if (data.staff_ids && data.staff_ids.length > 0) {
      const staff = await prisma.user.findMany({
        where: {
          user_id: { in: data.staff_ids },
          institution_id,
          role: 'Staff'
        },
        select: { user_id: true }
      })

      if (staff.length !== data.staff_ids.length) {
        throw new ErrorWithStatus({
          message: 'One or more staff members not found or do not belong to this institution',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    const updateData: Prisma.MedicationCarePlanAssignmentUpdateInput = {}

    if (data.resident_ids !== undefined) {
      updateData.resident_ids = data.resident_ids
    }
    if (data.room_ids !== undefined) {
      updateData.room_ids = data.room_ids
    }
    if (data.staff_ids !== undefined) {
      updateData.staff_ids = data.staff_ids
    }
    if (data.start_date !== undefined) {
      updateData.start_date = new Date(data.start_date)
    }
    if (data.end_date !== undefined) {
      updateData.end_date = data.end_date ? new Date(data.end_date) : null
    }
    if (data.time_slot !== undefined) {
      updateData.time_slot = data.time_slot || null
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes || null
    }

    return await prisma.medicationCarePlanAssignment.update({
      where: { assignment_id },
      data: updateData
    })
  }

  async deleteMedicationCarePlan(institution_id: string, assignment_id: string): Promise<void> {
    const assignment = await prisma.medicationCarePlanAssignment.findFirst({
      where: {
        assignment_id,
        institution_id
      }
    })

    if (!assignment) {
      throw new ErrorWithStatus({
        message: 'Care plan assignment not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    await prisma.medicationCarePlanAssignment.delete({
      where: { assignment_id }
    })
  }

  // ========== ALERTS & CONFLICTS ==========

  async getAlerts(institution_id: string, medication_id: string, resident_ids?: string[]): Promise<AlertResponse[]> {
    const medication = await this.getMedicationById(institution_id, medication_id)
    if (!medication) {
      throw new ErrorWithStatus({
        message: 'Medication not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const alerts: AlertResponse[] = []

    // If resident_ids provided, check conflicts for those residents
    if (resident_ids && resident_ids.length > 0) {
      const residents = await prisma.resident.findMany({
        where: {
          resident_id: { in: resident_ids },
          institution_id
        },
        include: {
          allergies: true,
          dietTags: {
            where: { is_active: true }
          }
        }
      })

      for (const resident of residents) {
        // Check allergy conflicts
        const medicationNameLower = medication.name.toLowerCase()
        for (const allergy of resident.allergies) {
          const allergySubstanceLower = allergy.substance.toLowerCase()
          if (
            medicationNameLower.includes(allergySubstanceLower) ||
            allergySubstanceLower.includes(medicationNameLower)
          ) {
            alerts.push({
              type: 'allergy',
              severity: allergy.severity === 'SEVERE' ? 'high' : allergy.severity === 'MODERATE' ? 'medium' : 'low',
              message: `Resident ${resident.full_name} is allergic to ${allergy.substance}`,
              resident_id: resident.resident_id,
              resident_name: resident.full_name,
              medication_id: medication.medication_id,
              medication_name: medication.name,
              suggestion: `Consider alternative medication or consult physician`
            })
          }
        }

        // Check diet conflicts (e.g., medication contains sugar for diabetic residents)
        for (const dietTag of resident.dietTags) {
          if (dietTag.tag_type === 'LowSugar') {
            // Check if medication name suggests sugar content
            const medNameLower = medication.name.toLowerCase()
            if (medNameLower.includes('syrup') || medNameLower.includes('sugar') || medNameLower.includes('glucose')) {
              alerts.push({
                type: 'diet',
                severity: 'medium',
                message: `Resident ${resident.full_name} requires low-sugar diet`,
                resident_id: resident.resident_id,
                resident_name: resident.full_name,
                medication_id: medication.medication_id,
                medication_name: medication.name,
                suggestion: `Check medication sugar content or use sugar-free alternative`
              })
            }
          }

          if (dietTag.tag_type === 'LowSodium') {
            const medNameLower = medication.name.toLowerCase()
            if (medNameLower.includes('sodium') || medNameLower.includes('salt')) {
              alerts.push({
                type: 'diet',
                severity: 'medium',
                message: `Resident ${resident.full_name} requires low-sodium diet`,
                resident_id: resident.resident_id,
                resident_name: resident.full_name,
                medication_id: medication.medication_id,
                medication_name: medication.name,
                suggestion: `Check medication sodium content`
              })
            }
          }
        }

        // Check schedule overlap - find other active medication assignments for this resident
        const otherAssignments = await prisma.medicationCarePlanAssignment.findMany({
          where: {
            institution_id,
            is_active: true,
            resident_ids: { has: resident.resident_id },
            medication_id: { not: medication_id }
          },
          include: {
            medication: {
              select: {
                medication_id: true,
                name: true,
                timing: true
              }
            }
          }
        })

        // Check for timing conflicts (same timing slot)
        for (const otherAssignment of otherAssignments) {
          // If both medications have same timing preference and are scheduled at similar times
          if (medication.timing === otherAssignment.medication.timing && medication.timing !== 'any_time') {
            alerts.push({
              type: 'schedule',
              severity: 'low',
              message: `Resident ${resident.full_name} has another medication (${otherAssignment.medication.name}) scheduled at the same time (${medication.timing})`,
              resident_id: resident.resident_id,
              resident_name: resident.full_name,
              medication_id: medication.medication_id,
              medication_name: medication.name,
              suggestion: `Consider spacing out medication times or consult physician`
            })
          }
        }
      }
    }

    return alerts
  }

  // ========== SUMMARY & AGGREGATION ==========

  async getSummary(institution_id: string) {
    const [medications, assignments, activeAssignments] = await Promise.all([
      prisma.medication.count({
        where: { institution_id, is_active: true }
      }),
      prisma.medicationCarePlanAssignment.count({
        where: { institution_id }
      }),
      prisma.medicationCarePlanAssignment.count({
        where: { institution_id, is_active: true }
      })
    ])

    // Get medications with assignment counts
    const medicationsWithCounts = await prisma.medication.findMany({
      where: { institution_id, is_active: true },
      include: {
        _count: {
          select: {
            assignments: {
              where: { is_active: true }
            }
          }
        }
      }
    })

    // Calculate conflicts (simplified - count alerts)
    let totalConflicts = 0
    for (const med of medicationsWithCounts) {
      const alerts = await this.getAlerts(institution_id, med.medication_id)
      totalConflicts += alerts.length
    }

    return {
      total_medications: medications,
      total_assignments: assignments,
      total_conflicts: totalConflicts,
      active_assignments: activeAssignments,
      medications: medicationsWithCounts.map((med) => ({
        medication_id: med.medication_id,
        name: med.name,
        dosage: med.dosage,
        form: String(med.form),
        frequency: med.frequency,
        assignments_count: med._count.assignments,
        conflicts_count: 0 // Will be calculated per medication when needed
      }))
    }
  }

  // ========== ASSIGNED MEDICATIONS ==========

  async getAssignedMedications(
    institution_id: string,
    params: GetAssignedMedicationsQueryParams = {}
  ): Promise<{ data: AssignedMedicationResponse[]; total: number }> {
    const { take = 50, skip = 0, medication_id, resident_id, room_id, time_slot, is_active } = params

    const where: Prisma.MedicationCarePlanAssignmentWhereInput = {
      institution_id,
      is_active: is_active !== undefined ? is_active : true
    }

    if (medication_id) {
      where.medication_id = medication_id
    }

    if (resident_id) {
      where.resident_ids = { has: resident_id }
    }

    if (room_id) {
      where.room_ids = { has: room_id }
    }

    if (time_slot) {
      where.time_slot = time_slot as any
    }

    const [assignments, total] = await Promise.all([
      prisma.medicationCarePlanAssignment.findMany({
        where,
        take,
        skip,
        orderBy: { created_at: 'desc' },
        include: {
          medication: {
            select: {
              medication_id: true,
              name: true,
              dosage: true,
              form: true,
              frequency: true,
              timing: true
            }
          }
        }
      }),
      prisma.medicationCarePlanAssignment.count({ where })
    ])

    // Fetch related data and conflicts for each assignment
    const data: AssignedMedicationResponse[] = await Promise.all(
      assignments.map(async (assignment) => {
        // Get all unique resident IDs from both direct assignments and room assignments
        const allResidentIds = new Set(assignment.resident_ids)

        // If room_ids exist, get residents in those rooms
        if (assignment.room_ids.length > 0) {
          const roomsWithResidents = await prisma.room.findMany({
            where: {
              room_id: { in: assignment.room_ids },
              institution_id
            },
            include: {
              residents: {
                select: {
                  resident_id: true
                }
              }
            }
          })

          roomsWithResidents.forEach((room) => {
            room.residents.forEach((r) => {
              allResidentIds.add(r.resident_id)
            })
          })
        }

        // Fetch residents with full info
        const residents = await prisma.resident.findMany({
          where: {
            resident_id: { in: Array.from(allResidentIds) },
            institution_id
          },
          include: {
            room: {
              select: {
                room_id: true,
                room_number: true
              }
            },
            allergies: {
              select: {
                id: true,
                substance: true,
                severity: true
              }
            },
            dietTags: {
              where: { is_active: true },
              select: {
                tag_id: true,
                tag_type: true,
                tag_name: true
              }
            }
          }
        })

        // Fetch rooms
        const rooms =
          assignment.room_ids.length > 0
            ? await prisma.room.findMany({
                where: {
                  room_id: { in: assignment.room_ids },
                  institution_id
                },
                select: {
                  room_id: true,
                  room_number: true,
                  type: true,
                  capacity: true
                }
              })
            : []

        // Get conflicts for this medication and residents
        const conflicts = await this.getAlerts(institution_id, assignment.medication_id, Array.from(allResidentIds))

        return {
          assignment_id: assignment.assignment_id,
          medication: {
            medication_id: assignment.medication.medication_id,
            name: assignment.medication.name,
            dosage: assignment.medication.dosage,
            form: String(assignment.medication.form),
            frequency: assignment.medication.frequency,
            timing: String(assignment.medication.timing)
          },
          residents: residents.map((r) => ({
            resident_id: r.resident_id,
            full_name: r.full_name,
            room: r.room
              ? {
                  room_id: r.room.room_id,
                  room_number: r.room.room_number
                }
              : undefined,
            allergies: r.allergies.map((a) => ({
              id: a.id,
              substance: a.substance,
              severity: a.severity ? String(a.severity) : undefined
            })),
            dietTags: r.dietTags.map((dt) => ({
              tag_id: dt.tag_id,
              tag_type: String(dt.tag_type),
              tag_name: dt.tag_name
            }))
          })),
          rooms: rooms,
          start_date: assignment.start_date,
          end_date: assignment.end_date || undefined,
          time_slot: assignment.time_slot ? String(assignment.time_slot) : undefined,
          is_active: assignment.is_active,
          notes: assignment.notes || undefined,
          conflicts: conflicts.length > 0 ? conflicts : undefined
        }
      })
    )

    return { data, total }
  }
}

export const medicationCarePlanService = new MedicationCarePlanService()
