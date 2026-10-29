import { distanceKm, type Position } from '../rules/nearby.ts'

// The parts of an address, smallest first: barangay (locality) and city or municipality show on
// screen; province and postcode only in the location's tooltip.
export type Address = Partial<Record<'locality' | 'municipality' | 'province' | 'postcode', string>>

export interface PlacedAddress extends Position {
  address: Address
  at: number // ms since epoch of the lookup
}

// Reverse geocoding (position to address) by OpenStreetMap's Nominatim: free, no key, any country.
// Its usage policy allows light use: one request at a time, cached, not repeated for small moves.
const ENDPOINT = 'https://nominatim.openstreetmap.org/reverse'

// Only look up again after the phone moves this far, or on a manual refresh.
export const LOOKUP_AGAIN_KM = 0.25

// Rounded to 3 decimals (about 110 m) before it leaves the phone: enough for the barangay,
// less precise than the GPS fix.
const coarse = (n: number) => Math.round(n * 1000) / 1000

const pick = (o: Record<string, unknown>, keys: string[]) =>
  keys.map((k) => o[k]).find((v): v is string => typeof v === 'string' && v.trim() !== '')

// Nominatim's address keys vary by country; take the first one present for each part.
export function parseNominatim(json: unknown): Address | null {
  if (typeof json !== 'object' || json === null) return null
  const raw = (json as { address?: unknown }).address
  if (typeof raw !== 'object' || raw === null) return null
  const a = raw as Record<string, unknown>

  const municipality = pick(a, ['city', 'town', 'municipality', 'county'])
  // PH barangays come back as village, quarter or suburb depending on the town; neighbourhood is
  // usually a smaller place inside one.
  const locality = pick(a, ['village', 'quarter', 'suburb', 'neighbourhood', 'hamlet', 'city_district'])
  const address: Address = {
    locality: locality !== municipality ? locality : undefined,
    municipality,
    // Never the region: an independent city (Cebu City) has no province here, and "Central Visayas"
    // would be wrong. The listed area fills the gap instead.
    province: pick(a, ['province', 'state', 'state_district']),
    postcode: pick(a, ['postcode']),
  }
  return Object.values(address).some(Boolean) ? address : null
}

export async function lookUpAddress(position: Position, signal?: AbortSignal): Promise<Address | null> {
  const query = new URLSearchParams({
    format: 'jsonv2',
    lat: String(coarse(position.lat)),
    lon: String(coarse(position.lng)),
    zoom: '18',
    addressdetails: '1',
    'accept-language': 'en',
  })
  const res = await fetch(`${ENDPOINT}?${query}`, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  return parseNominatim(await res.json())
}

export function needsLookup(position: Position, last: PlacedAddress | null): boolean {
  return !last || distanceKm(position, last) >= LOOKUP_AGAIN_KM
}

// "Lahug, Cebu City": the short form for the header.
export function shortAddress(address: Address): string {
  return [address.locality, address.municipality].filter(Boolean).join(', ')
}
