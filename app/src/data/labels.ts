import type { Category, ContactKind, Labels } from '../types.ts'

const CATEGORY_DEFAULTS: Record<Category, string> = {
  tire_repair: 'Tire repair',
  mechanic: 'Mechanic',
  hospital: 'Hospital',
  fuel: 'Fuel',
  food: 'Food',
  store: 'Store',
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
