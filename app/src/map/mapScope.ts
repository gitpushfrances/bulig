import { byDistance, distanceKm, type Position, type Ranked } from '../rules/nearby.ts'
import type { Category, Service } from '../types.ts'

// The Map's two scopes (UI-UX.md, Map): Nearby is every place within NEARBY_KM of you, All is
// every listed place in the country, whatever the area. The category chips narrow either one.
export type MapScope = 'nearby' | 'all'
export const NEARBY_KM = 5

type Mappable = Service & Position

const onMap = (s: Service): s is Mappable => typeof s.lat === 'number' && typeof s.lng === 'number'

export interface ScopeInput {
  scope: MapScope
  category: Category | null
  // The phone's fix: distances on the sheet are always from here.
  position: Position | null
  // Where Nearby measures from: the fix, else the picked area's centre. null = Nearby can't work.
  origin: Position | null
}

// The places to pin, nearest to the phone first. Nearby without an origin shows nothing, rather
// than pretending a list of the whole country is "near you".
export function placesInScope(services: Service[], { scope, category, position, origin }: ScopeInput): Ranked<Mappable>[] {
  const pool = services.filter(onMap).filter((s) => !category || s.category === category)
  const near = scope === 'nearby' ? (origin ? pool.filter((s) => distanceKm(origin, s) <= NEARBY_KM) : []) : pool
  return byDistance(near, position) as Ranked<Mappable>[]
}

// A ring of `steps` points NEARBY_KM around a point, as [lng, lat] (MapLibre's order), closed.
export function circle(centre: Position, km = NEARBY_KM, steps = 64): [number, number][] {
  const dLat = km / 111.32
  const dLng = km / (111.32 * Math.cos((centre.lat * Math.PI) / 180))
  const ring: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI
    ring.push([centre.lng + dLng * Math.cos(a), centre.lat + dLat * Math.sin(a)])
  }
  return ring
}

// [[west, south], [east, north]] around some points, or null for none.
export function boundsOf(points: [number, number][]): [[number, number], [number, number]] | null {
  if (!points.length) return null
  let [w, s] = points[0]
  let [e, n] = points[0]
  for (const [lng, lat] of points) {
    w = Math.min(w, lng)
    e = Math.max(e, lng)
    s = Math.min(s, lat)
    n = Math.max(n, lat)
  }
  return [
    [w, s],
    [e, n],
  ]
}
