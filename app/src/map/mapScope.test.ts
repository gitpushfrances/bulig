import { describe, expect, it } from 'vitest'
import { distanceKm } from '../rules/nearby.ts'
import type { Service } from '../types.ts'
import { boundsOf, circle, NEARBY_KM, placesInScope } from './mapScope.ts'

const place = (id: string, lat: number | undefined, lng: number | undefined, extra: Partial<Service> = {}): Service => ({
  id,
  country: 'PH',
  area: 'guiuan',
  category: 'tire_repair',
  name: id,
  landmark: '',
  lat,
  lng,
  verifiedAt: '2026-11-01',
  source: 'test',
  ...extra,
})

// Guiuan town centre, roughly.
const here = { lat: 11.03, lng: 125.72 }
const services = [
  place('close', 11.035, 125.72), // ~0.6 km
  place('edge', 11.03 + 4.9 / 111.32, 125.72), // ~4.9 km
  place('outside', 11.03 + 5.2 / 111.32, 125.72), // ~5.2 km
  place('other-town', 11.4, 125.5, { area: 'mercedes', category: 'fuel' }), // ~48 km, another area
  place('no-pin', undefined, undefined),
]

describe('placesInScope', () => {
  it('Nearby keeps only places within 5 km of you, nearest first', () => {
    const got = placesInScope(services, { scope: 'nearby', category: null, position: here, origin: here })
    expect(got.map((r) => r.item.id)).toEqual(['close', 'edge'])
    expect(got.every((r) => (r.km ?? Infinity) <= NEARBY_KM)).toBe(true)
  })

  it('All shows every place with a pin, in every area, with no radius', () => {
    const got = placesInScope(services, { scope: 'all', category: null, position: here, origin: here })
    expect(got.map((r) => r.item.id)).toEqual(['close', 'edge', 'outside', 'other-town'])
  })

  it('All works without a location, by name', () => {
    const got = placesInScope(services, { scope: 'all', category: null, position: null, origin: null })
    expect(got).toHaveLength(4)
    expect(got.every((r) => r.km === null)).toBe(true)
  })

  it('Nearby with no fix and no area shows nothing instead of the whole country', () => {
    expect(placesInScope(services, { scope: 'nearby', category: null, position: null, origin: null })).toEqual([])
  })

  it('Nearby measures from the area centre when there is no fix, but shows no distance', () => {
    const got = placesInScope(services, { scope: 'nearby', category: null, position: null, origin: here })
    expect(got.map((r) => r.item.id).sort()).toEqual(['close', 'edge'])
    expect(got.every((r) => r.km === null)).toBe(true)
  })

  it('a category narrows either scope', () => {
    expect(placesInScope(services, { scope: 'all', category: 'fuel', position: here, origin: here }).map((r) => r.item.id)).toEqual([
      'other-town',
    ])
    expect(placesInScope(services, { scope: 'nearby', category: 'fuel', position: here, origin: here })).toEqual([])
  })
})

describe('circle', () => {
  it('is a closed ring 5 km from the centre all the way round', () => {
    const ring = circle(here)
    expect(ring[0]).toEqual(ring.at(-1))
    for (const [lng, lat] of ring) expect(distanceKm(here, { lat, lng })).toBeCloseTo(NEARBY_KM, 1)
  })
})

describe('boundsOf', () => {
  it('wraps the points, and is null for none', () => {
    expect(boundsOf([])).toBeNull()
    expect(
      boundsOf([
        [125.7, 11.1],
        [125.5, 11.4],
        [125.8, 11.0],
      ]),
    ).toEqual([
      [125.5, 11.0],
      [125.8, 11.4],
    ])
  })
})
