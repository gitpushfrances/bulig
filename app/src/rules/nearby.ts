import type { Area } from '../types.ts'

export interface Position {
  lat: number
  lng: number
}

// An area this close counts as "here". Further away, the app says how far the nearest listed area is.
export const NEAR_KM = 30

const EARTH_KM = 6371
const rad = (deg: number) => (deg * Math.PI) / 180

// Straight-line (haversine) distance. Good enough to rank places a few km apart.
export function distanceKm(a: Position, b: Position): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

const hasPoint = <T extends { lat?: number; lng?: number }>(x: T): x is T & Position =>
  typeof x.lat === 'number' && typeof x.lng === 'number'

// The listed area whose centre is closest to the phone. Areas without a centre are skipped.
export function nearestArea(position: Position, areas: Area[]): { area: Area; km: number } | null {
  let best: { area: Area; km: number } | null = null
  for (const area of areas) {
    if (!hasPoint(area)) continue
    const km = distanceKm(position, area)
    if (!best || km < best.km) best = { area, km }
  }
  return best
}

export interface Ranked<T> {
  item: T
  km: number | null
}

// Nearest first when the phone's position is known; places without coordinates go last.
// Without a position, by name.
export function byDistance<T extends { name: string; lat?: number; lng?: number }>(
  items: T[],
  position: Position | null,
): Ranked<T>[] {
  return items
    .map((item) => ({ item, km: position && hasPoint(item) ? distanceKm(position, item) : null }))
    .sort(
      (a, b) =>
        (a.km ?? Infinity) - (b.km ?? Infinity) || a.item.name.localeCompare(b.item.name),
    )
}

// "350 m", "1.2 km", "18 km".
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}
