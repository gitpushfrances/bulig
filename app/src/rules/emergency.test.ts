import { describe, expect, it } from 'vitest'
import type { EmergencyContact } from '../types.ts'
import { isExpired, visibleContacts } from './emergency.ts'

const now = new Date('2026-10-29T00:00:00Z')

function contact(over: Partial<EmergencyContact>): EmergencyContact {
  return {
    id: over.id ?? 'x',
    country: 'PH',
    area: 'ph-guiuan',
    name: 'X',
    kind: 'police',
    phones: ['123'],
    verifiedAt: '2026-10-01',
    source: 'test',
    ...over,
  }
}

const national = contact({ id: 'nat', area: null, kind: 'national', name: '911' })

describe('isExpired', () => {
  it('keeps a contact checked exactly 180 days ago', () => {
    expect(isExpired(contact({ verifiedAt: '2026-05-02' }), now)).toBe(false)
  })

  it('expires a contact checked 181 days ago', () => {
    expect(isExpired(contact({ verifiedAt: '2026-05-01' }), now)).toBe(true)
  })

  it('treats a missing or broken date as expired', () => {
    expect(isExpired(contact({ verifiedAt: '' }), now)).toBe(true)
    expect(isExpired(contact({ verifiedAt: 'soon' }), now)).toBe(true)
  })
})

describe('visibleContacts', () => {
  it('always puts the national number first', () => {
    const list = visibleContacts([contact({ id: 'a' }), national], 'ph-guiuan', now)
    expect(list.map((c) => c.id)).toEqual(['nat', 'a'])
  })

  it('never hides the national number, even when its check is old', () => {
    const old = { ...national, verifiedAt: '2020-01-01' }
    expect(visibleContacts([old], null, now)).toEqual([old])
  })

  it('hides expired local numbers', () => {
    const list = visibleContacts([national, contact({ id: 'old', verifiedAt: '2025-01-01' })], null, now)
    expect(list.map((c) => c.id)).toEqual(['nat'])
  })

  it('shows only the picked area plus nationwide lines', () => {
    const list = visibleContacts(
      [
        national,
        contact({ id: 'here', area: 'ph-guiuan' }),
        contact({ id: 'there', area: 'ph-mercedes' }),
        contact({ id: 'coast', area: null, kind: 'coast_guard' }),
      ],
      'ph-guiuan',
      now,
    )
    expect(list.map((c) => c.id)).toEqual(['nat', 'here', 'coast'])
  })

  it('shows every area when none is picked', () => {
    const list = visibleContacts(
      [contact({ id: 'here', area: 'ph-guiuan' }), contact({ id: 'there', area: 'ph-mercedes' })],
      null,
      now,
    )
    expect(list).toHaveLength(2)
  })

  it('sorts local numbers by kind, then name', () => {
    const list = visibleContacts(
      [
        contact({ id: 'rescue', kind: 'rescue', name: 'A' }),
        contact({ id: 'fire', kind: 'fire', name: 'B' }),
        contact({ id: 'police-z', kind: 'police', name: 'Z' }),
        contact({ id: 'police-a', kind: 'police', name: 'A' }),
      ],
      null,
      now,
    )
    expect(list.map((c) => c.id)).toEqual(['police-a', 'police-z', 'fire', 'rescue'])
  })
})
