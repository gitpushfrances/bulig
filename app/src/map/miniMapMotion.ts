import { distanceKm, type Position } from '../rules/nearby.ts'

// How Home's mini map follows a moving phone. GPS reports every few seconds; jumping the map at
// each fix looks jerky, so the dot and the view glide to the new spot in GLIDE_MS. A big jump (a
// first sharp fix after a rough one, a tunnel) is a cut, not a slide across town.

export const GLIDE_MS = 900
export const CUT_KM = 1.5

export function shouldCut(from: Position, to: Position): boolean {
  return distanceKm(from, to) > CUT_KM
}

// The point a fraction t (0 to 1) of the way, eased out so the glide settles gently.
export function glideAt(from: Position, to: Position, t: number): Position {
  const k = 1 - (1 - Math.min(1, Math.max(0, t))) ** 3
  return { lat: from.lat + (to.lat - from.lat) * k, lng: from.lng + (to.lng - from.lng) * k }
}

// The accuracy circle's size on screen: metres over metres-per-pixel at this zoom (MapLibre's
// 512 px tiles). null when it would be too small to matter or the accuracy is unknown; capped so a
// 2 km guess doesn't paint the whole card.
export function accuracyPx(accuracyM: number | null, lat: number, zoom: number, maxPx = 140): number | null {
  if (accuracyM === null || !Number.isFinite(accuracyM)) return null
  const metresPerPx = (40_075_016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom)
  const px = accuracyM / metresPerPx
  if (px < 14) return null
  return Math.round(Math.min(px, maxPx))
}
