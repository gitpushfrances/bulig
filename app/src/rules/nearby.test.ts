import { describe, expect, it } from 'vitest'
import type { Area } from '../types.ts'
import { byDistance, distanceKm, formatDistance, nearestArea } from './nearby.ts'

const area = (id: string, lat?: number, lng?: number): Area => ({
  id,
  country: 'XX',
  name: id,
  region: 'R',
  lat,
  lng,
  languages: ['en'],
})

describe('distanceKm', () => {
  it('is zero for the same point and about 111 km per degree of latitude', () => {
    expect(distanceKm({ lat: 10, lng: 120 }, { lat: 10, lng: 120 })).toBe(0)
    expect(distanceKm({ lat: 10, lng: 120 }, { lat: 11, lng: 120 })).toBeCloseTo(111.2, 0)
  })
})

describe('nearestArea', () => {
  const areas = [area('far', 12, 120), area('near', 10.05, 120), area('no-centre')]

  it('picks the closest centre and skips areas without one', () => {
    const found = nearestArea({ lat: 10, lng: 120 }, areas)
    expect(found?.area.id).toBe('near')
    expect(found?.km).toBeCloseTo(5.6, 0)
  })

  it('returns null when no area has a centre', () => {
    expect(nearestArea({ lat: 10, lng: 120 }, [area('a')])).toBeNull()
  })
})

describe('byDistance', () => {
  const places = [
    { name: 'B far', lat: 10.2, lng: 120 },
    { name: 'C no point' },
    { name: 'A near', lat: 10.01, lng: 120 },
  ]

  it('sorts nearest first, places without coordinates last', () => {
    const ranked = byDistance(places, { lat: 10, lng: 120 })
    expect(ranked.map((r) => r.item.name)).toEqual(['A near', 'B far', 'C no point'])
    expect(ranked[2].km).toBeNull()
  })

  it('sorts by name without a position', () => {
    expect(byDistance(places, null).map((r) => r.item.name)).toEqual(['A near', 'B far', 'C no point'])
  })
})

describe('formatDistance', () => {
  it('uses metres under 1 km, one decimal under 10 km, whole km above', () => {
    expect(formatDistance(0.347)).toBe('350 m')
    expect(formatDistance(0.001)).toBe('10 m')
    expect(formatDistance(1.24)).toBe('1.2 km')
    expect(formatDistance(18.4)).toBe('18 km')
  })
})
