import { distanceKm, type Position } from '../rules/nearby.ts'

// Which GPS fixes to believe. Phones answer first with a rough guess from Wi-Fi or the cell tower
// (often 100 m to 2 km off), then sharpen it with satellites. Two rules keep the dot honest:
// - a much rougher fix soon after a good one is the phone guessing again, not the person moving, so
//   it is ignored unless it lands outside its own error circle (then they really moved);
// - anything rougher than ROUGH_M is shown as approximate, not as a precise dot.

export interface GpsFix extends Position {
  // Metres, as the phone reports it (68% confidence). Infinity when the phone doesn't say.
  accuracy: number
  at: number
}

export const ROUGH_M = 100
const TRUST_MS = 30_000

export function fromGeolocation(p: GeolocationPosition, at = Date.now()): GpsFix {
  const a = p.coords.accuracy
  return { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Number.isFinite(a) && a > 0 ? a : Infinity, at }
}

export function keepFix(prev: GpsFix | null, next: GpsFix): boolean {
  if (!prev) return true
  if (next.at - prev.at > TRUST_MS) return true
  if (next.accuracy <= Math.max(prev.accuracy * 2, ROUGH_M)) return true
  const movedM = distanceKm(prev, next) * 1000
  return movedM > next.accuracy
}
