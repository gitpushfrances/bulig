import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../types.ts'
import { NEEDS, needById, needForCategory } from './needs.ts'

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
