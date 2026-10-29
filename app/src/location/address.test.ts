import { describe, expect, it } from 'vitest'
import { needsLookup, parseNominatim, shortAddress } from './address.ts'

describe('parseNominatim', () => {
  it('maps a Philippine reply to barangay, municipality, province and postcode', () => {
    const reply = {
      address: { village: 'Lahug', city: 'Cebu City', state: 'Cebu', region: 'Central Visayas', postcode: '6000' },
    }
    expect(parseNominatim(reply)).toEqual({
      locality: 'Lahug',
      municipality: 'Cebu City',
      province: 'Cebu',
      postcode: '6000',
    })
  })

  it('drops a locality that only repeats the municipality, and missing parts', () => {
    expect(parseNominatim({ address: { town: 'Guiuan', suburb: 'Guiuan', state: 'Eastern Samar' } })).toEqual({
      locality: undefined,
      municipality: 'Guiuan',
      province: 'Eastern Samar',
      postcode: undefined,
    })
  })

  it('takes the barangay from quarter before suburb, and never uses the region as province', () => {
    const reply = {
      address: { quarter: 'Poblacion Ward 4', suburb: 'Poblacion Ward', town: 'Guiuan', region: 'Eastern Visayas' },
    }
    expect(parseNominatim(reply)).toMatchObject({ locality: 'Poblacion Ward 4', province: undefined })
  })

  it('returns null for an error or an empty address', () => {
    expect(parseNominatim({ error: 'Unable to geocode' })).toBeNull()
    expect(parseNominatim({ address: {} })).toBeNull()
    expect(parseNominatim('nope')).toBeNull()
  })
})

describe('needsLookup', () => {
  const last = { lat: 10, lng: 120, address: {}, at: 0 }

  it('looks up the first time and after a move of 250 m or more, not for small moves', () => {
    expect(needsLookup({ lat: 10, lng: 120 }, null)).toBe(true)
    expect(needsLookup({ lat: 10.001, lng: 120 }, last)).toBe(false)
    expect(needsLookup({ lat: 10.003, lng: 120 }, last)).toBe(true)
  })
})

describe('shortAddress', () => {
  it('joins the barangay and municipality', () => {
    expect(shortAddress({ locality: 'Lahug', municipality: 'Cebu City', province: 'Cebu' })).toBe('Lahug, Cebu City')
    expect(shortAddress({ province: 'Cebu' })).toBe('')
  })
})
