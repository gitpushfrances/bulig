import {
  Ambulance,
  Anchor,
  BedDouble,
  Disc,
  Flame,
  Fuel,
  Hospital,
  LifeBuoy,
  Shield,
  Siren,
  Store,
  TriangleAlert,
  Utensils,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { Category, ContactKind } from '../types.ts'

// One outline set (Lucide), one stroke. Every category and contact kind has its own mark.
export const ICON_STROKE = 1.75

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  tire_repair: Disc,
  mechanic: Wrench,
  hospital: Hospital,
  fuel: Fuel,
  food: Utensils,
  lodging: BedDouble,
  store: Store,
}

export const KIND_ICONS: Record<ContactKind, LucideIcon> = {
  national: Siren,
  police: Shield,
  fire: Flame,
  medical: Ambulance,
  rescue: LifeBuoy,
  coast_guard: Anchor,
  disaster: TriangleAlert,
}
