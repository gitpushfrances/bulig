import { describe, expect, it } from 'vitest'
import { pickCountry } from './countries.ts'

describe('pickCountry', () => {
  it('uses a saved live country first', () => {
    expect(pickCountry('PH', ['de-DE'])).toBe('PH')
  })

  it('reads the region from the browser language', () => {
    expect(pickCountry(null, ['fil-PH'])).toBe('PH')
  })

  it('falls back to the first live country', () => {
    expect(pickCountry('XX', ['de-DE', 'en'])).toBe('PH')
  })
})
