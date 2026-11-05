import { readSaved, writeSaved } from '../data/storage.ts'
import type { AreaId, Category, Day, Feature, WeeklyHours } from '../types.ts'
import { DAYS } from '../types.ts'
import type { NewPlaceChanges, PhotoSource } from './store.ts'

// The Add a place form, kept on the phone after every change (API.md §10, bulig.drafts.*), so a
// dropped signal or a closed tab never loses the work. Cleared once it is sent.

export type HoursMode = 'same' | 'allday' | 'byday'

export interface DraftPhoto {
  // From POST /uploads. Expires 24 hours after upload, so old ones are dropped on load.
  id: string
  uploadedAt: number
  source: PhotoSource
  // A small preview (data URL, about 160px), so the draft stays small.
  thumb: string
}

export interface Draft {
  category: Category | null
  name: string
  subtype: string
  lat: number | null
  lng: number | null
  area: AreaId | null
  landmark: string
  hoursMode: HoursMode
  opens: string
  closes: string
  // byday: one open-close pair per day; a day missing = closed.
  days: Partial<Record<Day, [string, string]>>
  features: Feature[]
  phone: string
  photos: DraftPhoto[]
  note: string
}

export const EMPTY_DRAFT: Draft = {
  category: null,
  name: '',
  subtype: '',
  lat: null,
  lng: null,
  area: null,
  landmark: '',
  hoursMode: 'same',
  opens: '',
  closes: '',
  days: {},
  features: [],
  phone: '',
  photos: [],
  note: '',
}

const draftKey = (email: string) => `bulig.drafts.new-place.${email}`
export const UPLOAD_LIFE_MS = 23 * 60 * 60 * 1000 // a little under the server's 24 hours

export function loadDraft(email: string, now = Date.now()): Draft {
  try {
    const raw = JSON.parse(readSaved(draftKey(email)) ?? 'null') as Partial<Draft> | null
    if (!raw || typeof raw !== 'object') return EMPTY_DRAFT
    const draft = { ...EMPTY_DRAFT, ...raw }
    draft.photos = (draft.photos ?? []).filter((p) => p && now - p.uploadedAt < UPLOAD_LIFE_MS)
    return draft
  } catch {
    return EMPTY_DRAFT
  }
}

export function saveDraft(email: string, draft: Draft | null): void {
  writeSaved(draftKey(email), draft ? JSON.stringify(draft) : null)
}

export const MAX_PHOTOS = 3
export const LANDMARK_MAX = 120
export const NAME_MAX = 80
export const NOTE_MAX = 500

// What each category can tick in "What do they offer?". The rest have nothing to tick.
export const FEATURES_FOR: Partial<Record<Category, Feature[]>> = {
  tire_repair: ['tubeless', 'tube_type', 'air_pump', 'comes_to_you', 'motorcycle', 'car_truck'],
  mechanic: ['motorcycle', 'car_truck', 'comes_to_you'],
  fuel: ['bottled_fuel', 'air_pump'],
  hospital: ['emergency_room'],
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export function weeklyHoursOf(draft: Draft): { weeklyHours?: WeeklyHours; open24h?: boolean } {
  if (draft.hoursMode === 'allday') return { open24h: true }
  if (draft.hoursMode === 'same') {
    if (!TIME.test(draft.opens) || !TIME.test(draft.closes)) return {}
    const range: [string, string] = [draft.opens, draft.closes]
    return { weeklyHours: Object.fromEntries(DAYS.map((d) => [d, [range]])) as WeeklyHours }
  }
  const out: WeeklyHours = {}
  for (const d of DAYS) {
    const r = draft.days[d]
    if (r && TIME.test(r[0]) && TIME.test(r[1])) out[d] = [r]
  }
  return Object.keys(out).length ? { weeklyHours: out } : {}
}

// "0917 123 4567" → "+639171234567"; empty stays empty.
function phoneE164(phone: string): string | undefined {
  const digits = phone.replace(/[\s-]/g, '')
  if (!digits) return undefined
  if (digits.startsWith('+63')) return digits
  if (digits.startsWith('63')) return `+${digits}`
  if (digits.startsWith('0')) return `+63${digits.slice(1)}`
  return digits
}

export const isPhone = (v: string) => !v.trim() || /^(\+?63|0)9\d{9}$/.test(v.replace(/[\s-]/g, ''))

// The `changes` for POST /submissions, or the first step that still needs something.
export function toChanges(draft: Draft): { ok: true; changes: NewPlaceChanges } | { ok: false; step: 0 | 1 | 2 | 3 } {
  if (!draft.category || !draft.name.trim()) return { ok: false, step: 0 }
  if (draft.lat === null || draft.lng === null || !draft.area || !draft.landmark.trim()) return { ok: false, step: 1 }
  if (!isPhone(draft.phone)) return { ok: false, step: 2 }
  if (!draft.photos.length) return { ok: false, step: 3 }
  const offered = (FEATURES_FOR[draft.category] ?? []).filter((f) => draft.features.includes(f))
  const changes: NewPlaceChanges = {
    name: draft.name.trim(),
    category: draft.category,
    area: draft.area,
    landmark: draft.landmark.trim(),
    // About 1 m: enough to find the door, no more.
    lat: Math.round(draft.lat * 1e5) / 1e5,
    lng: Math.round(draft.lng * 1e5) / 1e5,
    ...(draft.subtype.trim() && draft.category === 'other' ? { subtype: draft.subtype.trim() } : {}),
    ...(phoneE164(draft.phone) ? { phone: phoneE164(draft.phone) } : {}),
    ...weeklyHoursOf(draft),
    ...(offered.length ? { features: Object.fromEntries(offered.map((f) => [f, true])) } : {}),
  }
  return { ok: true, changes }
}

// Today in the phone's own time zone, as the API's ISO date.
export function today(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

// What a step still needs, in plain words, or null when it's done.
export function checkStep(step: number, draft: Draft): string | null {
  if (step === 0) {
    if (!draft.category) return 'Pick what kind of place it is.'
    if (!draft.name.trim()) return 'Type the name of the place.'
  }
  if (step === 1) {
    if (draft.lat === null || draft.lng === null) return 'Put the pin on the place first.'
    if (!draft.area) return 'Pick the town.'
    if (!draft.landmark.trim()) return 'Add a landmark so people can find it.'
  }
  if (step === 2 && !isPhone(draft.phone)) return 'Fix the phone number, or leave it empty.'
  if (step === 3 && !draft.photos.length) return 'Add at least one photo of the place.'
  return null
}
