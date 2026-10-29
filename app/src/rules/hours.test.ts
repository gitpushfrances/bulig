import { describe, expect, it } from 'vitest'
import type { Service } from '../types.ts'
import { describeStatus, formatTime, hoursForDay, isUsuallyOpen, openStatus } from './hours.ts'

const base: Service = {
  id: 's',
  country: 'PH',
  area: 'a',
  category: 'mechanic',
  name: 'Shop',
  landmark: 'here',
  verifiedAt: '2026-10-01',
  source: 'test',
}

// Weekdays 8–6, Saturday 8–noon, closed Sunday.
const shop: Service = {
  ...base,
  weeklyHours: {
    mon: [['08:00', '18:00']],
    tue: [['08:00', '18:00']],
    wed: [['08:00', '18:00']],
    thu: [['08:00', '18:00']],
    fri: [['08:00', '18:00']],
    sat: [['08:00', '12:00']],
  },
}
// A night food stall: 6 PM to 2 AM, every day.
const night: Service = {
  ...base,
  weeklyHours: Object.fromEntries(
    ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => [d, [['18:00', '02:00']]]),
  ),
}

// 2026-11-02 is a Monday.
const at = (iso: string) => new Date(`${iso}:00`)

describe('openStatus', () => {
  it('is open inside the hours and says until when', () => {
    expect(openStatus(shop, at('2026-11-02T09:30'))).toEqual({ state: 'open', closes: '18:00' })
  })

  it('is closed at the closing minute, and says when it opens next', () => {
    expect(openStatus(shop, at('2026-11-02T18:00'))).toEqual({ state: 'closed', opens: { day: 'tue', time: '08:00' } })
    expect(openStatus(shop, at('2026-11-02T06:00'))).toEqual({ state: 'closed', opens: { day: 'mon', time: '08:00' } })
  })

  it('skips a closed day', () => {
    // Saturday afternoon → next opening Monday 8 AM.
    expect(openStatus(shop, at('2026-11-07T15:00'))).toEqual({ state: 'closed', opens: { day: 'mon', time: '08:00' } })
  })

  it('handles hours that run past midnight', () => {
    expect(isUsuallyOpen(night, at('2026-11-02T23:00'))).toBe(true)
    expect(openStatus(night, at('2026-11-03T01:30'))).toEqual({ state: 'open', closes: '02:00' })
    expect(isUsuallyOpen(night, at('2026-11-03T03:00'))).toBe(false)
  })

  it('is open around the clock with open24h, and unknown without hours', () => {
    expect(openStatus({ ...base, open24h: true }, at('2026-11-02T03:00'))).toEqual({ state: 'open', closes: null })
    expect(openStatus(base, at('2026-11-02T12:00'))).toEqual({ state: 'unknown' })
  })
})

describe('wording', () => {
  it('formats times the way people say them', () => {
    expect(formatTime('06:00')).toBe('6 AM')
    expect(formatTime('18:30')).toBe('6:30 PM')
    expect(formatTime('12:00')).toBe('noon')
    expect(formatTime('24:00')).toBe('midnight')
  })

  it('always says "usually"', () => {
    const now = at('2026-11-02T19:00')
    expect(describeStatus(openStatus(shop, now), now)).toBe('Usually closed at this time · opens 8 AM tomorrow')
    const sat = at('2026-11-07T13:00')
    expect(describeStatus(openStatus(shop, sat), sat)).toBe('Usually closed at this time · opens 8 AM Monday')
    const morning = at('2026-11-02T09:00')
    expect(describeStatus(openStatus(shop, morning), morning)).toBe('Usually open at this time · until 6 PM')
    expect(describeStatus({ state: 'unknown' }, morning)).toBeNull()
  })

  it('lists a day for Place details', () => {
    expect(hoursForDay(shop, 'sat')).toBe('8 AM – noon')
    expect(hoursForDay(shop, 'sun')).toBe('Closed')
    expect(hoursForDay({ ...base, open24h: true }, 'sun')).toBe('Open 24 hours')
    expect(hoursForDay(base, 'mon')).toBeNull()
  })
})
