import { CATEGORIES, CONTACT_KINDS, DAYS, FEATURES } from '../types.ts'

// Checks a data file against contract v1. Returns a list of problems; empty means valid.
// Used by the tests (CI goes red on a bad file) and at runtime (a bad file is an error, not a crash).

export type FileKind = 'areas' | 'emergency' | 'services'

type Rec = Record<string, unknown>

const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const isDate = (v: unknown) => isText(v) && !Number.isNaN(Date.parse(v))
const isTime = (v: unknown) => typeof v === 'string' && /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(v)
const isFeatures = (v: unknown) =>
  isRec(v) && Object.entries(v).every(([k, b]) => (FEATURES as readonly string[]).includes(k) && typeof b === 'boolean')
const isWeeklyHours = (v: unknown) =>
  isRec(v) &&
  Object.entries(v).every(
    ([day, ranges]) =>
      (DAYS as readonly string[]).includes(day) &&
      Array.isArray(ranges) &&
      ranges.every((r) => Array.isArray(r) && r.length === 2 && isTime(r[0]) && isTime(r[1])),
  )
const isCountry = (v: unknown) => typeof v === 'string' && /^[A-Z]{2}$/.test(v)

function checkItem(kind: FileKind, item: Rec): string[] {
  const problems: string[] = []
  const need = (ok: boolean, field: string) => {
    if (!ok) problems.push(field)
  }

  need(isText(item.id), 'id')
  need(isCountry(item.country), 'country')
  need(isText(item.name), 'name')

  if (kind === 'areas') {
    need(isText(item.region), 'region')
    need(Array.isArray(item.languages) && item.languages.length > 0, 'languages')
    need(item.level === undefined || isText(item.level), 'level')
    need(item.parent === undefined || item.parent === null || isText(item.parent), 'parent')
    need((item.lat === undefined) === (item.lng === undefined), 'lat/lng')
    return problems
  }

  need(isDate(item.verifiedAt), 'verifiedAt')
  need(isText(item.source), 'source')
  need(item.sample === undefined || typeof item.sample === 'boolean', 'sample')

  if (kind === 'emergency') {
    need(item.area === null || isText(item.area), 'area')
    need((CONTACT_KINDS as readonly unknown[]).includes(item.kind), 'kind')
    need(Array.isArray(item.phones) && item.phones.length > 0 && item.phones.every(isText), 'phones')
  } else {
    need(isText(item.area), 'area')
    need((CATEGORIES as readonly unknown[]).includes(item.category), 'category')
    need(isText(item.landmark), 'landmark')
    need(item.phone === undefined || isText(item.phone), 'phone')
    need((item.lat === undefined) === (item.lng === undefined), 'lat/lng')
    need(item.subtype === undefined || isText(item.subtype), 'subtype')
    need(item.addedAt === undefined || isDate(item.addedAt), 'addedAt')
    need(item.features === undefined || isFeatures(item.features), 'features')
    need(item.weeklyHours === undefined || isWeeklyHours(item.weeklyHours), 'weeklyHours')
    need(item.open24h === undefined || typeof item.open24h === 'boolean', 'open24h')
  }
  return problems
}

export function validateEnvelope(kind: FileKind, data: unknown): string[] {
  if (!isRec(data)) return ['file is not an object']
  const problems: string[] = []
  if (data.version !== 1) problems.push('version must be 1')
  if (!isDate(data.updatedAt)) problems.push('updatedAt')
  if (!Array.isArray(data.items)) return [...problems, 'items must be a list']

  data.items.forEach((item, i) => {
    if (!isRec(item)) {
      problems.push(`items[${i}] is not an object`)
      return
    }
    const bad = checkItem(kind, item)
    if (bad.length) problems.push(`items[${i}] (${String(item.id)}): bad ${bad.join(', ')}`)
  })
  return problems
}
