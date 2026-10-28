import { describe, expect, it } from 'vitest'
import { validateEnvelope } from './validate.ts'

const contact = {
  id: 'ph-911',
  country: 'PH',
  area: null,
  name: '911',
  kind: 'national',
  phones: ['911'],
  verifiedAt: '2026-10-01',
  source: 'test',
}

const envelope = (items: unknown[]) => ({ version: 1, updatedAt: '2026-10-29T00:00:00Z', items })

describe('validateEnvelope', () => {
  it('accepts a valid file', () => {
    expect(validateEnvelope('emergency', envelope([contact]))).toEqual([])
  })

  it('rejects a record without verifiedAt or source', () => {
    const bare: Record<string, unknown> = { ...contact }
    delete bare.verifiedAt
    delete bare.source
    expect(validateEnvelope('emergency', envelope([bare]))).toEqual([
      'items[0] (ph-911): bad verifiedAt, source',
    ])
  })

  it('rejects an unknown category or kind', () => {
    expect(validateEnvelope('emergency', envelope([{ ...contact, kind: 'ambulance' }]))[0]).toMatch(/kind/)
  })

  it('rejects a lower-case or long country code', () => {
    expect(validateEnvelope('emergency', envelope([{ ...contact, country: 'ph' }]))[0]).toMatch(/country/)
  })

  it('rejects the wrong envelope', () => {
    expect(validateEnvelope('areas', { version: 2, items: 'x' })).toEqual([
      'version must be 1',
      'updatedAt',
      'items must be a list',
    ])
  })
})
