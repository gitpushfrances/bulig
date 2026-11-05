import { describe, expect, it } from 'vitest'
import { accuracyPx, glideAt, shouldCut } from './miniMapMotion.ts'

const A = { lat: 11.035, lng: 125.7228 }
const B = { lat: 11.036, lng: 125.7238 }

describe('mini map motion', () => {
  it('glides from one fix to the next and stops exactly on it', () => {
    expect(glideAt(A, B, 0)).toEqual(A)
    expect(glideAt(A, B, 1)).toEqual(B)
    expect(glideAt(A, B, 2)).toEqual(B)
    const mid = glideAt(A, B, 0.5)
    expect(mid.lat).toBeGreaterThan(A.lat)
    expect(mid.lat).toBeLessThan(B.lat)
  })

  it('cuts instead of sliding across town', () => {
    expect(shouldCut(A, B)).toBe(false)
    expect(shouldCut(A, { lat: 11.06, lng: 125.7228 })).toBe(true)
  })

  it('sizes the accuracy ring, hides it when tiny or unknown, caps a wild guess', () => {
    // At zoom 15 near Guiuan a pixel is about 2.4 m.
    expect(accuracyPx(100, 11, 15)).toBeGreaterThan(35)
    expect(accuracyPx(100, 11, 15)).toBeLessThan(50)
    expect(accuracyPx(10, 11, 15)).toBeNull()
    expect(accuracyPx(null, 11, 15)).toBeNull()
    expect(accuracyPx(Infinity, 11, 15)).toBeNull()
    expect(accuracyPx(3000, 11, 15)).toBe(140)
  })
})
