import { Ambulance, Anchor, Bed, Fire, ForkKnife, GasPump, Hospital, type Icon, Lifebuoy, Shield, Siren, Sparkle, Storefront, Tire, Warning, Wrench } from '@phosphor-icons/react'
import type { Category, ContactKind } from '../types.ts'

// One icon family (Phosphor, regular weight; docs/UI-UX.md "Icons"). Every category and contact
// kind has its own mark: a tire for vulcanizing, a pump for gas, a wrench for mechanics.

export const CATEGORY_ICONS: Record<Category, Icon> = {
  tire_repair: Tire,
  mechanic: Wrench,
  hospital: Hospital,
  fuel: GasPump,
  food: ForkKnife,
  lodging: Bed,
  store: Storefront,
  other: Sparkle,
}

export const KIND_ICONS: Record<ContactKind, Icon> = {
  national: Siren,
  police: Shield,
  fire: Fire,
  medical: Ambulance,
  rescue: Lifebuoy,
  coast_guard: Anchor,
  disaster: Warning,
}
