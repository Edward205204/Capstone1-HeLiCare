import { CorrectionSourceType } from '@prisma/client'
import { prisma } from '~/utils/db'

interface RecordFieldCorrectionsParams {
  source_type: CorrectionSourceType
  source_id: string
  corrected_by_id: string
  reason?: string
  before: Record<string, any> | null
  after: Record<string, any> | null
  fields: string[]
}

class CorrectionLogService {
  private serialize(value: unknown): string | null {
    if (value === null || value === undefined) return null
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'string') return value
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  async recordFieldCorrections({
    source_type,
    source_id,
    corrected_by_id,
    reason,
    before,
    after,
    fields
  }: RecordFieldCorrectionsParams) {
    if (!before || !after) return
    const payload = fields
      .map((field) => {
        const previous_value = this.serialize(before[field])
        const new_value = this.serialize(after[field])
        if (previous_value === new_value) {
          return null
        }
        return {
          source_type,
          source_id,
          field,
          previous_value,
          new_value,
          reason,
          corrected_by_id
        }
      })
      .filter(Boolean) as Array<{
      source_type: CorrectionSourceType
      source_id: string
      field: string
      previous_value: string | null
      new_value: string | null
      reason?: string
      corrected_by_id: string
    }>

    if (!payload.length) {
      return
    }

    await prisma.healthDataCorrection.createMany({
      data: payload
    })
  }
}

const correctionLogService = new CorrectionLogService()

export { correctionLogService, CorrectionLogService }
