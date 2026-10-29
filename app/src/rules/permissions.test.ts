import { describe, expect, it } from 'vitest'
import type { Account } from '../auth/types.ts'
import type { Area } from '../types.ts'
import { can, isWithin } from './permissions.ts'

const area = (id: string, parent: string | null = null): Area => ({
  id,
  country: 'XX',
  name: id,
  region: 'R',
  parent,
  languages: ['en'],
})

// A city with one barangay, and an unrelated town.
const areas = [area('city'), area('brgy-1', 'city'), area('town')]

const user: Account = { email: 'u@x', name: 'U', role: 'user', areas: [] }
const moderator: Account = { email: 'm@x', name: 'M', role: 'moderator', areas: ['city'] }
const admin: Account = { email: 'a@x', name: 'A', role: 'admin', areas: [] }

describe('isWithin', () => {
  it('counts an area as inside itself and inside its parent', () => {
    expect(isWithin('city', 'city', areas)).toBe(true)
    expect(isWithin('brgy-1', 'city', areas)).toBe(true)
    expect(isWithin('city', 'brgy-1', areas)).toBe(false)
    expect(isWithin('town', 'city', areas)).toBe(false)
  })

  it('stops on a loop in bad data', () => {
    expect(isWithin('a', 'z', [area('a', 'b'), area('b', 'a')])).toBe(false)
  })
})

describe('can', () => {
  it('lets nobody do anything when signed out', () => {
    expect(can(null, 'save')).toBe(false)
  })

  it('lets a user save and report, but not review', () => {
    expect(can(user, 'save')).toBe(true)
    expect(can(user, 'report')).toBe(true)
    expect(can(user, 'review', 'city', areas)).toBe(false)
  })

  it('limits a moderator to their own area and the areas inside it', () => {
    expect(can(moderator, 'verify', 'city', areas)).toBe(true)
    expect(can(moderator, 'verify', 'brgy-1', areas)).toBe(true)
    expect(can(moderator, 'verify', 'town', areas)).toBe(false)
    expect(can(moderator, 'verify', null, areas)).toBe(false)
    expect(can(moderator, 'manage_accounts')).toBe(false)
  })

  it('lets an admin do everything everywhere', () => {
    expect(can(admin, 'verify', 'town', areas)).toBe(true)
    expect(can(admin, 'manage_accounts')).toBe(true)
  })
})
