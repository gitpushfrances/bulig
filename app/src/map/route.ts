import type { Position } from '../rules/nearby.ts'

// Routes along OpenStreetMap roads from the free OSRM servers run by FOSSGIS (the German
// OpenStreetMap association), the same ones openstreetmap.org uses for its Directions.
// No key or account; fair use only. A busy Bulig moves to its own OSRM with a Philippines extract.
// Sends the start (the phone's position) and the destination; see the Privacy Policy.
const ROUTER = 'https://routing.openstreetmap.de'

// Motorcycles use the car profile: OSRM has no motorcycle one, and they share the same roads.
export type TravelMode = 'car' | 'foot'

const PROFILE: Record<TravelMode, string> = { car: 'routed-car', foot: 'routed-foot' }

export interface Route {
  // [lng, lat] pairs along the road, for a GeoJSON LineString.
  path: [number, number][]
  metres: number
  seconds: number
}

export async function fetchRoute(from: Position, to: Position, mode: TravelMode, signal?: AbortSignal): Promise<Route> {
  const pair = (p: Position) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`
  const url = `${ROUTER}/${PROFILE[mode]}/route/v1/driving/${pair(from)};${pair(to)}?overview=full&geometries=geojson&steps=false`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`router ${res.status}`)
  const json = (await res.json()) as {
    code?: string
    routes?: { geometry?: { coordinates?: [number, number][] }; distance?: number; duration?: number }[]
  }
  const best = json.routes?.[0]
  if (json.code !== 'Ok' || !best?.geometry?.coordinates?.length) throw new Error('no route')
  return { path: best.geometry.coordinates, metres: best.distance ?? 0, seconds: best.duration ?? 0 }
}

// "11 min", "1 h 05 min"
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

// Ask again when the phone enters a new cell of this size: 0.002° is about 220 m in the Philippines.
export const REROUTE_DEG = 0.002
