import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../types.ts'
import { NEEDS, needById, needForCategory, rankForNeed } from './needs.ts'

describe('needs', () => {
  it('covers every category exactly once', () => {
    expect(NEEDS.map((n) => n.category).sort()).toEqual([...CATEGORIES].sort())
  })

  it('has unique URL slugs', () => {
    expect(new Set(NEEDS.map((n) => n.id)).size).toBe(NEEDS.length)
  })

  it('finds a need by slug or category', () => {
    expect(needById('flat-tire')?.category).toBe('tire_repair')
    expect(needById('nope')).toBeNull()
    expect(needForCategory('lodging').id).toBe('hotel')
  })

  it('marks only the hospital as urgent', () => {
    expect(NEEDS.filter((n) => n.urgent).map((n) => n.id)).toEqual(['hospital'])
  })
})

describe('rankForNeed', () => {
  const base = { country: 'PH', area: 'a', landmark: 'x', verifiedAt: '2026-10-01', source: 't' }
  const shop = (id: string, km: number, extra: object = {}) => ({
    item: { ...base, id, name: id, category: 'tire_repair' as const, ...extra },
    km,
  })
  const monday9am = new Date('2026-11-02T09:00:00')
  const dayShift = { weeklyHours: { mon: [['08:00', '18:00']] } }
  const nightShift = { weeklyHours: { mon: [['20:00', '23:00']] } }
  const flatTire = needById('flat-tire')!

  it('keeps only confirmed features for a chip, nearest first', () => {
    const ranked = [
      shop('a', 1, { features: { air_pump: false } }),
      shop('b', 2, { features: { air_pump: true } }),
      shop('c', 3),
      shop('d', 4, { features: { air_pump: true } }),
    ]
    expect(rankForNeed(ranked, flatTire, ['air_pump'], monday9am).places.map((r) => r.item.id)).toEqual(['b', 'd'])
  })

  it('filters to places usually open now', () => {
    const ranked = [shop('a', 1, nightShift), shop('b', 2, dayShift), shop('c', 3)]
    expect(rankForNeed(ranked, flatTire, ['open_now'], monday9am).places.map((r) => r.item.id)).toEqual(['b'])
  })

  it('points to the nearest usually-open place when the nearest is closed', () => {
    const ranked = [shop('a', 1, nightShift), shop('b', 2), shop('c', 3, dayShift)]
    expect(rankForNeed(ranked, flatTire, [], monday9am).nearestOpen?.item.id).toBe('c')
    const openFirst = [shop('c', 1, dayShift), shop('a', 2, nightShift)]
    expect(rankForNeed(openFirst, flatTire, [], monday9am).nearestOpen).toBeNull()
  })

  it('puts hospitals with an emergency room first', () => {
    const hospital = (id: string, km: number, er: boolean) => ({
      item: { ...base, id, name: id, category: 'hospital' as const, features: { emergency_room: er } },
      km,
    })
    // Input arrives nearest first, as byDistance() gives it.
    const ranked = [hospital('clinic', 1, false), hospital('er-near', 3, true), hospital('er-far', 5, true)]
    expect(rankForNeed(ranked, needById('hospital')!, [], monday9am).places.map((r) => r.item.id)).toEqual([
      'er-near',
      'er-far',
      'clinic',
    ])
  })
})
