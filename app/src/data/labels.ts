import { CATEGORIES, type Category, type ContactKind, type Labels } from '../types.ts'

const CATEGORY_DEFAULTS: Record<Category, string> = {
  tire_repair: 'Tire repair',
  mechanic: 'Mechanic',
  hospital: 'Hospital',
  fuel: 'Fuel',
  food: 'Food',
  lodging: 'Hotel',
  store: 'Store',
}

// One line under each card on What we offer. Plain words that work in any country.
const CATEGORY_BLURBS: Record<Category, string> = {
  tire_repair: 'Flat tires, patching and air',
  mechanic: 'Engines, brakes and breakdowns',
  fuel: 'Gas, diesel and oil',
  hospital: 'Emergency rooms and clinics',
  food: 'Hot meals along the road',
  lodging: 'A room for the night',
  store: 'Water, snacks and supplies',
}

const KIND_LABELS: Record<ContactKind, string> = {
  national: 'National emergency',
  police: 'Police',
  fire: 'Fire',
  medical: 'Medical',
  rescue: 'Rescue',
  coast_guard: 'Coast guard',
  disaster: 'Disaster office',
}

// The country's own word for a category ("Vulcanizing" in PH), else the English default.
export function categoryLabel(category: Category, labels: Labels | null, lang = 'en'): string {
  return labels?.categories[category]?.[lang] ?? CATEGORY_DEFAULTS[category]
}

export function kindLabel(kind: ContactKind): string {
  return KIND_LABELS[kind]
}

export function categoryBlurb(category: Category): string {
  return CATEGORY_BLURBS[category]
}

// URL form of a category: tire_repair <-> tire-repair.
export const categorySlug = (category: Category) => category.replace(/_/g, '-')
export const categoryFromSlug = (slug: string | undefined): Category | null =>
  CATEGORIES.find((c) => categorySlug(c) === slug) ?? null
