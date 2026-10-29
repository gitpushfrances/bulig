import { describe, expect, it } from 'vitest'
import type { Area, EmergencyContact, Envelope, Service } from '../types.ts'
import { FALLBACK_EMERGENCY, LIVE_COUNTRIES } from './countries.ts'
import { validateEnvelope } from './validate.ts'

// Every shipped data file must match the contract. A bad file turns CI red.
const files = import.meta.glob<unknown>('../../public/data/*/*.json', { eager: true, import: 'default' })

function file<T>(cc: string, name: string): T {
  const data = files[`../../public/data/${cc}/${name}`]
  if (data === undefined) throw new Error(`missing public/data/${cc}/${name}`)
  return data as T
}

describe.each(LIVE_COUNTRIES.map((c) => c.toLowerCase()))('data for %s', (cc) => {
  const areas = file<Envelope<Area>>(cc, 'areas.json')
  const emergency = file<Envelope<EmergencyContact>>(cc, 'emergency-contacts.json')
  const services = file<Envelope<Service>>(cc, 'services.json')

  it('matches the contract', () => {
    expect(validateEnvelope('areas', areas)).toEqual([])
    expect(validateEnvelope('emergency', emergency)).toEqual([])
    expect(validateEnvelope('services', services)).toEqual([])
  })

  it('only holds records for this country', () => {
    const all = [...areas.items, ...emergency.items, ...services.items]
    expect(all.filter((r) => r.country.toLowerCase() !== cc)).toEqual([])
  })

  it('points every record at an area that exists', () => {
    const ids = new Set(areas.items.map((a) => a.id))
    const bad = [...emergency.items, ...services.items].filter((r) => r.area !== null && !ids.has(r.area))
    expect(bad.map((r) => r.id)).toEqual([])
  })

  it('has unique ids', () => {
    const all = [...areas.items, ...emergency.items, ...services.items].map((r) => r.id)
    expect(new Set(all).size).toBe(all.length)
  })

  it('points every parent at an area that exists', () => {
    const ids = new Set(areas.items.map((a) => a.id))
    const bad = areas.items.filter((a) => a.parent != null && !ids.has(a.parent))
    expect(bad.map((a) => a.id)).toEqual([])
  })

  it('has a national number that matches the offline fallback', () => {
    const national = emergency.items.filter((c) => c.kind === 'national' && c.area === null)
    expect(national.length).toBeGreaterThan(0)
    expect(national[0].phones[0]).toBe(FALLBACK_EMERGENCY[cc.toUpperCase()])
  })
})
