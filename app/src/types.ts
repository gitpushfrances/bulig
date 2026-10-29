// Data contract v1. See docs/ARCHITECTURE.md, "1. Data contract".
// Every record carries a country and an area so new countries are data, not code.

export type CountryCode = string // ISO 3166-1 alpha-2, upper case: "PH"
export type AreaId = string // slug, unique worldwide: "ph-eastern-samar-guiuan"

// 'other' is last on purpose: new stalls and local finds (halo-halo, BBQ, kiosks), shown after the road needs.
export const CATEGORIES = ['tire_repair', 'mechanic', 'fuel', 'hospital', 'food', 'lodging', 'store', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

// What a place is confirmed to offer. In data: true = confirmed, false = confirmed not offered,
// missing = not confirmed. Only true counts for a filter.
export const FEATURES = [
  'tubeless',
  'tube_type',
  'air_pump',
  'comes_to_you',
  'motorcycle',
  'car_truck',
  'bottled_fuel',
  'emergency_room',
] as const
export type Feature = (typeof FEATURES)[number]

// Days in JavaScript's Date.getDay() order, Sunday first.
export const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export type Day = (typeof DAYS)[number]

// ["07:00", "18:00"] in 24-hour local time. A close at or before the open runs past midnight
// (["18:00", "02:00"]); "24:00" means midnight.
export type TimeRange = [string, string]
export type WeeklyHours = Partial<Record<Day, TimeRange[]>>

export const CONTACT_KINDS = [
  'national',
  'police',
  'fire',
  'medical',
  'rescue',
  'coast_guard',
  'disaster',
] as const
export type ContactKind = (typeof CONTACT_KINDS)[number]

export interface Area {
  id: AreaId
  country: CountryCode
  name: string
  region: string
  // The country's own word for this kind of area: "city", "municipality", "barangay".
  level?: string
  // The area this one sits inside (a barangay's municipality). null or missing = top level.
  parent?: AreaId | null
  // The town centre. Used to find the area from GPS. Both or neither.
  lat?: number
  lng?: number
  languages: string[] // BCP 47, first is the default UI language
}

export interface EmergencyContact {
  id: string
  country: CountryCode
  area: AreaId | null // null = nationwide line
  name: string
  kind: ContactKind
  phones: string[] // first is primary
  verifiedAt: string // ISO date of the last check
  source: string
  sample?: boolean
}

export interface Service {
  id: string
  country: CountryCode
  area: AreaId
  category: Category
  name: string
  phone?: string
  landmark: string
  lat?: number
  lng?: number
  hours?: string
  // What it is, in the owner's words: "Halo-halo", "BBQ". Shown instead of the category name.
  subtype?: string
  // ISO date the place was first listed. Places listed in the last 60 days get a NEW badge.
  addedAt?: string
  features?: Partial<Record<Feature, boolean>>
  // Usual hours per day; a day that is missing is closed. Ignored when open24h is true.
  weeklyHours?: WeeklyHours
  open24h?: boolean
  verifiedAt: string
  source: string
  sample?: boolean
}

export interface Envelope<T> {
  version: 1
  updatedAt: string
  items: T[]
}

// Local words for each category, per language: { tire_repair: { en: "Vulcanizing" } }
export interface Labels {
  version: 1
  categories: Partial<Record<Category, Record<string, string>>>
}
