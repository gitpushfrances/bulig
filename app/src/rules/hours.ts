import { DAYS, type Day, type Service } from '../types.ts'

// Whether a place is usually open, from its usual weekly hours. Always "usually": these are
// reported schedules, never a live guarantee (docs/UI-UX.md, "Safety and trust").
// Times are the phone's local time, which in the Philippines is the places' time too. A country
// spanning time zones would need Area.timeZone.

export type OpenStatus =
  | { state: 'open'; closes: string | null } // null: open around the clock
  | { state: 'closed'; opens: { day: Day; time: string } | null } // null: no hours in the week
  | { state: 'unknown' }

const minutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function openStatus(service: Service, now: Date): OpenStatus {
  if (service.open24h) return { state: 'open', closes: null }
  const week = service.weeklyHours
  if (!week) return { state: 'unknown' }

  const day = now.getDay()
  const at = now.getHours() * 60 + now.getMinutes()
  const today = week[DAYS[day]] ?? []
  const yesterday = week[DAYS[(day + 6) % 7]] ?? []

  // Still open from last night (a range that runs past midnight)?
  for (const [open, close] of yesterday) {
    if (minutes(close) <= minutes(open) && at < minutes(close)) return { state: 'open', closes: close }
  }
  for (const [open, close] of today) {
    const o = minutes(open)
    const c = minutes(close)
    const overnight = c <= o
    if (at >= o && (overnight || at < c)) return { state: 'open', closes: close }
  }

  // Closed: the next opening, later today or on a following day.
  const later = today.map(([open]) => open).filter((open) => minutes(open) > at).sort()
  if (later.length) return { state: 'closed', opens: { day: DAYS[day], time: later[0] } }
  for (let ahead = 1; ahead <= 7; ahead++) {
    const d = DAYS[(day + ahead) % 7]
    const first = (week[d] ?? []).map(([open]) => open).sort()[0]
    if (first) return { state: 'closed', opens: { day: d, time: first } }
  }
  return { state: 'closed', opens: null }
}

export const isUsuallyOpen = (service: Service, now: Date) => openStatus(service, now).state === 'open'

// "6 AM", "6:30 PM", "midnight", "noon"
export function formatTime(t: string): string {
  const total = minutes(t) % (24 * 60)
  if (total === 0) return 'midnight'
  if (total === 12 * 60) return 'noon'
  const h = Math.floor(total / 60)
  const m = total % 60
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`
}

export const DAY_NAMES: Record<Day, string> = {
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
}

// One line for a card: "Usually open at this time · until 8 PM", "Usually closed at this time ·
// opens 6 AM tomorrow". null when the hours aren't known.
export function describeStatus(status: OpenStatus, now: Date): string | null {
  if (status.state === 'unknown') return null
  if (status.state === 'open')
    return status.closes === null
      ? 'Usually open 24 hours'
      : `Usually open at this time · until ${formatTime(status.closes)}`
  if (!status.opens) return 'Usually closed'
  const today = DAYS[now.getDay()]
  const tomorrow = DAYS[(now.getDay() + 1) % 7]
  const when =
    status.opens.day === today ? '' : status.opens.day === tomorrow ? ' tomorrow' : ` ${DAY_NAMES[status.opens.day]}`
  return `Usually closed at this time · opens ${formatTime(status.opens.time)}${when}`
}

// A short word for list rows: "Open", "Closed", or nothing when unknown.
export function shortStatus(status: OpenStatus): string | null {
  return status.state === 'unknown' ? null : status.state === 'open' ? 'Usually open' : 'Usually closed'
}

// "6 AM – 8 PM", "Closed", "Open 24 hours", for Place details' week.
export function hoursForDay(service: Service, day: Day): string | null {
  if (service.open24h) return 'Open 24 hours'
  if (!service.weeklyHours) return null
  const ranges = service.weeklyHours[day] ?? []
  if (!ranges.length) return 'Closed'
  return ranges.map(([open, close]) => `${formatTime(open)} – ${formatTime(close)}`).join(', ')
}
