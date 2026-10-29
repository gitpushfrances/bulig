import type { Category } from '../types.ts'

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
}

export const NEEDS: readonly Need[] = [
  { id: 'flat-tire', label: 'Flat tire', category: 'tire_repair', finds: 'Vulcanizing shops', one: 'vulcanizing shop' },
  { id: 'breakdown', label: 'Breakdown', category: 'mechanic', finds: 'Mechanics', one: 'mechanic' },
  { id: 'out-of-gas', label: 'Out of gas', category: 'fuel', finds: 'Gas stations', one: 'gas station' },
  { id: 'hospital', label: 'Hospital', category: 'hospital', finds: 'Hospitals and clinics', one: 'hospital or clinic', urgent: true },
  { id: 'food', label: 'Food', category: 'food', finds: 'Restos and carinderias', one: 'resto or carinderia' },
  { id: 'hotel', label: 'Hotel', category: 'lodging', finds: 'Hotels and inns', one: 'hotel or inn' },
  { id: 'store', label: 'Store', category: 'store', finds: 'Stores', one: 'store' },
  { id: 'others', label: 'Others', category: 'other', finds: 'New stalls and local finds', one: 'new stall or local find' },
]

export const needById = (id: string | undefined): Need | null => NEEDS.find((n) => n.id === id) ?? null

export const needForCategory = (category: Category): Need => NEEDS.find((n) => n.category === category)!

export const nearbyHref = (need: Need) => `/nearby/${need.id}`
