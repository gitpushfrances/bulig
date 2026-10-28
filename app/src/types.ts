// Data contract v1. See docs/ARCHITECTURE.md, "1. Data contract".
// Every record carries a country and an area so new countries are data, not code.

export type CountryCode = string // ISO 3166-1 alpha-2, upper case: "PH"
export type AreaId = string // slug, unique worldwide: "ph-eastern-samar-guiuan"

export const CATEGORIES = ['tire_repair', 'mechanic', 'hospital', 'fuel', 'food', 'store'] as const
export type Category = (typeof CATEGORIES)[number]

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
