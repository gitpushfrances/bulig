// What the Map draws as DOM pins: only what is on screen. MapLibre groups the places on the GPU
// (a clustered GeoJSON source), and this picks the groups and single places inside the view, so a
// phone draws a few dozen buttons whether the country has 100 places or 50,000.

// Most single pins drawn at once. Past this a cheap phone starts to stutter while panning.
export const MAX_PINS = 300

export interface ClusterSpot {
  clusterId: number
  count: number
  lng: number
  lat: number
}

export interface OnScreen {
  places: string[]
  clusters: ClusterSpot[]
}

// The parts of a MapLibre GeoJSONFeature this reads.
export interface SourceFeature {
  properties: Record<string, unknown> | null
  geometry: { type: string; coordinates?: unknown }
}

type Bounds = [[number, number], [number, number]] // [[west, south], [east, north]]

// A source feature appears once per tile it touches, so the same place or group can come back
// several times: keep the first. `keep` (the open place) is always drawn when it is a single pin.
export function onScreen(features: SourceFeature[], [[w, s], [e, n]]: Bounds, keep: string | null = null, cap = MAX_PINS): OnScreen {
  // A little past the edges, so pins don't pop in at the border while panning.
  const padLng = (e - w) * 0.1
  const padLat = (n - s) * 0.1
  const inside = (lng: number, lat: number) => lng >= w - padLng && lng <= e + padLng && lat >= s - padLat && lat <= n + padLat

  const places: string[] = []
  const seenPlaces = new Set<string>()
  const clusters: ClusterSpot[] = []
  const seenClusters = new Set<number>()
  let kept = false

  for (const f of features) {
    if (f.geometry.type !== 'Point' || !Array.isArray(f.geometry.coordinates)) continue
    const [lng, lat] = f.geometry.coordinates as [number, number]
    if (!inside(lng, lat)) continue
    const p = f.properties ?? {}
    if (p.cluster === true || typeof p.cluster_id === 'number') {
      const clusterId = Number(p.cluster_id)
      if (seenClusters.has(clusterId)) continue
      seenClusters.add(clusterId)
      clusters.push({ clusterId, count: Number(p.point_count) || 0, lng, lat })
    } else if (typeof p.id === 'string' && !seenPlaces.has(p.id)) {
      seenPlaces.add(p.id)
      if (p.id === keep) kept = true
      else if (places.length < cap) places.push(p.id)
    }
  }
  if (kept) places.push(keep!)
  return { places, clusters }
}

// "12", "1.2k", "35k": short enough for a 40px bubble.
export function clusterLabel(count: number): string {
  if (count < 1000) return String(count)
  if (count < 10000) return `${(Math.floor(count / 100) / 10).toString()}k`
  return `${Math.floor(count / 1000)}k`
}
