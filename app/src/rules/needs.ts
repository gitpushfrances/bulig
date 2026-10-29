import { isUsuallyOpen } from './hours.ts'
import type { Ranked } from './nearby.ts'
import type { Category, Feature, Service } from '../types.ts'

// "What's wrong?": each need is the problem in the person's words, mapped to the kind of place
// that solves it. Data, not page code: a new need is one entry. Order is Home's bento order.
// See docs/UI-UX.md, "Nearby results".
export interface Need {
  id: string // URL slug: /nearby/flat-tire
  label: string // the problem: "Flat tire"
  category: Category
  // What the list holds, for the subtitle: "Vulcanizing shops", and one of them.
  finds: string
  one: string
  // Hospital calls read "Call hospital" and the page points at 911 for life-threatening cases.
  urgent?: boolean
  // Filter chips on Nearby results, in order. A feature chip keeps places where it is confirmed.
  chips: Chip[]
  // Features worth showing on this need's cards ("Tubeless ✓", "Comes to you · Not confirmed").
  shows: Feature[]
}

export type Chip = Feature | 'open_now'

export const CHIP_LABELS: Record<Chip, string> = {
  open_now: 'Usually open now',
  tubeless: 'Tubeless',
  tube_type: 'Tube type',
  air_pump: 'Air pump',
  comes_to_you: 'Comes to you',
  motorcycle: 'Motorcycle',
  car_truck: 'Car or truck',
  bottled_fuel: 'Bottled fuel',
  emergency_room: 'Emergency room',
}

export const NEEDS: readonly Need[] = [
  { id: 'flat-tire', label: 'Flat tire', category: 'tire_repair', finds: 'Vulcanizing shops', one: 'vulcanizing shop', chips: ['air_pump', 'tubeless', 'comes_to_you', 'open_now'], shows: ['tubeless', 'air_pump', 'comes_to_you'] },
  { id: 'breakdown', label: 'Breakdown', category: 'mechanic', finds: 'Mechanics', one: 'mechanic', chips: ['motorcycle', 'car_truck', 'comes_to_you', 'open_now'], shows: ['motorcycle', 'car_truck', 'comes_to_you'] },
  { id: 'out-of-gas', label: 'Out of gas', category: 'fuel', finds: 'Gas stations', one: 'gas station', chips: ['bottled_fuel', 'open_now'], shows: ['bottled_fuel', 'air_pump'] },
  { id: 'hospital', label: 'Hospital', category: 'hospital', finds: 'Hospitals and clinics', one: 'hospital or clinic', urgent: true, chips: ['emergency_room', 'open_now'], shows: ['emergency_room'] },
  { id: 'food', label: 'Food', category: 'food', finds: 'Restos and carinderias', one: 'resto or carinderia', chips: ['open_now'], shows: [] },
  { id: 'hotel', label: 'Hotel', category: 'lodging', finds: 'Hotels and inns', one: 'hotel or inn', chips: [], shows: [] },
  { id: 'store', label: 'Store', category: 'store', finds: 'Stores', one: 'store', chips: ['open_now'], shows: [] },
  { id: 'others', label: 'Others', category: 'other', finds: 'New stalls and local finds', one: 'new stall or local find', chips: ['open_now'], shows: [] },
]

export const needById = (id: string | undefined): Need | null => NEEDS.find((n) => n.id === id) ?? null

export const needForCategory = (category: Category): Need => NEEDS.find((n) => n.category === category)!

export const nearbyHref = (need: Need) => `/nearby/${need.id}`

export interface NeedResults {
  places: Ranked<Service>[]
  // When the nearest place is usually closed: the nearest one usually open now, if any.
  nearestOpen: Ranked<Service> | null
}

// Nearby results for a need: its kind of place, the chosen chips applied, nearest first. Hospitals
// with a confirmed emergency room come first (still nearest first among themselves).
export function rankForNeed(ranked: Ranked<Service>[], need: Need, chips: Chip[], now: Date): NeedResults {
  let places = ranked.filter((r) => r.item.category === need.category)
  for (const chip of chips) {
    places = places.filter((r) => (chip === 'open_now' ? isUsuallyOpen(r.item, now) : r.item.features?.[chip] === true))
  }
  if (need.category === 'hospital') {
    const er = (r: Ranked<Service>) => (r.item.features?.emergency_room ? 0 : 1)
    places = [...places].sort((a, b) => er(a) - er(b))
  }
  const first = places[0]
  const nearestOpen =
    first && !isUsuallyOpen(first.item, now) ? (places.find((r) => isUsuallyOpen(r.item, now)) ?? null) : null
  return { places, nearestOpen }
}
