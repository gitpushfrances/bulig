import { describe, expect, it } from 'vitest'
import type { Service } from '../types.ts'
import { filterServices } from './services.ts'

function service(over: Partial<Service>): Service {
  return {
    id: over.id ?? 'x',
    country: 'PH',
    area: 'ph-guiuan',
    category: 'tire_repair',
    name: 'X',
    landmark: 'Near the market',
    verifiedAt: '2026-10-01',
    source: 'test',
    ...over,
  }
}

const list = [
  service({ id: 'tire-g', name: 'Rudy Vulcanizing', area: 'ph-guiuan' }),
  service({ id: 'tire-m', name: 'Ben Tire Shop', area: 'ph-mercedes' }),
  service({ id: 'fuel-g', name: 'Petron', category: 'fuel', landmark: 'Beside the plaza' }),
]

const ids = (s: Service[]) => s.map((x) => x.id)

describe('filterServices', () => {
  it('returns everything, sorted by name, with no filters', () => {
    expect(ids(filterServices(list, {}))).toEqual(['tire-m', 'fuel-g', 'tire-g'])
  })

  it('filters by area', () => {
    expect(ids(filterServices(list, { area: 'ph-mercedes' }))).toEqual(['tire-m'])
  })

  it('filters by category', () => {
    expect(ids(filterServices(list, { category: 'fuel' }))).toEqual(['fuel-g'])
  })

  it('searches name and landmark, ignoring case and spaces', () => {
    expect(ids(filterServices(list, { query: '  rudy ' }))).toEqual(['tire-g'])
    expect(ids(filterServices(list, { query: 'PLAZA' }))).toEqual(['fuel-g'])
  })

  it('combines filters', () => {
    expect(ids(filterServices(list, { area: 'ph-guiuan', category: 'tire_repair' }))).toEqual(['tire-g'])
  })
})
