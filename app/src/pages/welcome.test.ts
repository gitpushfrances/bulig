import { describe, expect, it } from 'vitest'
import { WELCOME_MESSAGES, greeting, pickWelcome } from './welcome.ts'

const at = (h: number, m = 0) => new Date(2026, 10, 4, h, m)

describe('greeting', () => {
  it.each([
    [0, 0, 'Up late?'],
    [4, 59, 'Up late?'],
    [5, 0, 'Good morning'],
    [11, 59, 'Good morning'],
    [12, 0, 'Good afternoon'],
    [16, 59, 'Good afternoon'],
    [17, 0, 'Good evening'],
    [23, 59, 'Good evening'],
  ])('%i:%i is %s', (h, m, expected) => {
    expect(greeting(at(h, m))).toBe(expected)
  })
})

describe('pickWelcome', () => {
  const n = WELCOME_MESSAGES.length

  it('picks any message the first time', () => {
    expect(pickWelcome(null, () => 0)).toBe(0)
    expect(pickWelcome(null, () => 0.9999)).toBe(n - 1)
  })

  it('never repeats the last message, whatever the random number', () => {
    for (let last = 0; last < n; last++) {
      for (const r of [0, 0.25, 0.5, 0.75, 0.9999]) {
        const i = pickWelcome(last, () => r)
        expect(i).not.toBe(last)
        expect(i).toBeGreaterThanOrEqual(0)
        expect(i).toBeLessThan(n)
      }
    }
  })

  it('treats a saved index out of range as no last message', () => {
    expect(pickWelcome(99, () => 0)).toBe(0)
  })

  it('keeps every message short enough for the header', () => {
    for (const m of WELCOME_MESSAGES) expect(m.length).toBeLessThanOrEqual(46)
  })
})
