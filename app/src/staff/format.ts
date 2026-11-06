import type { SubmissionReason } from './types.ts'

export const REASON_LABEL: Record<SubmissionReason, string> = {
  new_place: 'New place',
  changed: 'Changed',
  number_not_working: 'Number not working',
  closed_for_good: 'Closed',
  wrong_location: 'Wrong location',
  duplicate: 'Duplicate',
  other: 'Other',
}

export const isFlag = (reason: SubmissionReason) => reason !== 'new_place' && reason !== 'changed'

export function ago(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000))
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} minutes ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  )
}

const DAY_SHORT: Record<string, string> = {
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
}

export const FIELD_LABEL: Record<string, string> = {
  name: 'Name',
  category: 'Kind',
  area: 'Town',
  landmark: 'Landmark',
  location: 'Map pin',
  phone: 'Phone',
  weeklyHours: 'Hours',
  open24h: 'Open 24 hours',
  features: 'Offers',
  subtype: 'Type',
  prices: 'Prices',
}

// A new place can't go live without these (API.md §7.8, approve).
export const NEEDED_FOR_NEW = ['name', 'category', 'area', 'landmark']

// One field's value in words, for current → proposed. Names come from the lookups passed in.
export function fieldText(
  key: string,
  value: unknown,
  names: {
    category?: (c: string) => string
    area?: (id: string) => string
  } = {},
): string {
  if (value === null || value === undefined || value === '') return 'Nothing'
  if (key === 'category' && typeof value === 'string') return names.category?.(value) ?? value
  if (key === 'area' && typeof value === 'string') return names.area?.(value) ?? value
  if (key === 'location' && typeof value === 'object' && value && 'lat' in value && 'lng' in value) {
    const { lat, lng } = value as { lat: number; lng: number }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
  if (key === 'weeklyHours' && typeof value === 'object') {
    const days = Object.entries(value as Record<string, [string, string][]>)
    if (!days.length) return 'Closed every day'
    return days
      .map(([d, ranges]) => `${DAY_SHORT[d] ?? d} ${ranges.map(([a, b]) => `${a}–${b}`).join(', ')}`)
      .join(' · ')
  }
  if (key === 'prices' && Array.isArray(value))
    return value
      .map((p: { item: string; amount: number }) => `${p.item.replace(/_/g, ' ')} ₱${p.amount.toFixed(2)}`)
      .join(', ')
  if (key === 'features' && typeof value === 'object') {
    const on = Object.entries(value as Record<string, boolean>).filter(([, v]) => v)
    return on.length ? on.map(([k]) => k.replace(/_/g, ' ')).join(', ') : 'None'
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

// A hotline number as the server takes it (API.md §7.8): a short local hotline (3 to 6 digits, such
// as 166 or 117) as typed, else a PH number in E.164. null = not a number we can save.
export function hotlinePhone(input: string): string | null {
  const raw = input.replace(/[\s()-]/g, '')
  if (/^\d{3,6}$/.test(raw)) return raw
  let e164 = raw
  if (raw.startsWith('63')) e164 = `+${raw}`
  else if (raw.startsWith('0')) e164 = `+63${raw.slice(1)}`
  return /^\+63\d{9,10}$/.test(e164) ? e164 : null
}

// "+639171234567" → "0917 123 4567" for the form; short hotlines unchanged.
export function localPhone(phone: string): string {
  const m = /^\+63(\d{3})(\d{3})(\d{3,4})$/.exec(phone)
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : phone
}
