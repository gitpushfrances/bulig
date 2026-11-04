import type { Map as MapLibreMap } from 'maplibre-gl'

// Fetches the map tiles just outside the screen while the map sits still, so panning a little
// shows streets at once instead of blank squares.
//
// The service worker keeps every tile it sees (CacheFirst, see vite.config.ts), so a tile fetched
// here is ready from the phone's storage when the person pans onto it. A ring of one tile around
// the screen at the current zoom, plus the screen's tiles one zoom out (what MapLibre draws when
// zooming out, or blurry while a sharp tile loads), is about 15 tiles per new spot.
//
// Data is money for most riders, so it holds back: nothing offline, on Data Saver or on 2G; it
// stops the moment the map moves (the screen's own tiles come first); each tile once per session;
// and at most SESSION_LIMIT tiles per session.

export interface TileBounds {
  west: number
  south: number
  east: number
  north: number
}

export interface Tile {
  z: number
  x: number
  y: number
}

const PER_IDLE = 24
// About 5 MB at most per app session.
const SESSION_LIMIT = 150
const PARALLEL = 3

function lngToX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * 2 ** z)
}

function latToY(lat: number, z: number): number {
  const clamped = Math.max(-85.0511, Math.min(85.0511, lat))
  const rad = (clamped * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z)
}

function range(bounds: TileBounds, z: number, ring: number) {
  const max = 2 ** z - 1
  const clamp = (n: number) => Math.max(0, Math.min(max, n))
  return {
    x0: clamp(lngToX(bounds.west, z) - ring),
    x1: clamp(lngToX(bounds.east, z) + ring),
    y0: clamp(latToY(bounds.north, z) - ring),
    y1: clamp(latToY(bounds.south, z) + ring),
  }
}

// The tiles worth fetching for this view, nearest to the screen first: the ring around the screen
// at the tile zoom MapLibre is using, then the screen one zoom out.
export function tilesAround(bounds: TileBounds, zoom: number, minzoom = 0, maxzoom = 14): Tile[] {
  // Vector tiles are 512 px, so the tile zoom is the map zoom rounded down (and never past the
  // source's last zoom: MapLibre stretches z14 tiles beyond that).
  const z = Math.max(minzoom, Math.min(maxzoom, Math.floor(zoom)))
  const seen = (r: ReturnType<typeof range>, t: Tile) => t.x >= r.x0 && t.x <= r.x1 && t.y >= r.y0 && t.y <= r.y1
  const screen = range(bounds, z, 0)
  const ring = range(bounds, z, 1)
  const cx = (screen.x0 + screen.x1) / 2
  const cy = (screen.y0 + screen.y1) / 2
  const out: Tile[] = []
  for (let x = ring.x0; x <= ring.x1; x++) {
    for (let y = ring.y0; y <= ring.y1; y++) {
      const t = { z, x, y }
      if (!seen(screen, t)) out.push(t)
    }
  }
  out.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))
  if (z - 1 >= minzoom) {
    const up = range(bounds, z - 1, 0)
    for (let x = up.x0; x <= up.x1; x++) for (let y = up.y0; y <= up.y1; y++) out.push({ z: z - 1, x, y })
  }
  return out
}

export function tileUrl(template: string, t: Tile, scheme: 'xyz' | 'tms' = 'xyz'): string {
  const y = scheme === 'tms' ? 2 ** t.z - 1 - t.y : t.y
  return template.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(y))
}

interface NetworkInfo {
  saveData?: boolean
  effectiveType?: string
}

// Whether spending data on tiles nobody looked at yet is fair right now.
export function canPrefetch(nav: Navigator = navigator): boolean {
  if (!nav.onLine) return false
  const net = (nav as Navigator & { connection?: NetworkInfo }).connection
  if (net?.saveData) return false
  if (net?.effectiveType === '2g' || net?.effectiveType === 'slow-2g') return false
  return true
}

// Each tile once per app session (fetched or on its way), shared by every visit to the Map tab.
const fetched = new Set<string>()

export function resetPrefetch(): void {
  fetched.clear()
}

interface VectorSourceLike {
  type: string
  tiles?: string[]
  minzoom?: number
  maxzoom?: number
  scheme?: 'xyz' | 'tms'
}

// Starts prefetching whenever the map settles, and stops when it moves. Returns the off switch.
export function prefetchTiles(map: MapLibreMap, fetcher: typeof fetch = fetch.bind(globalThis)): () => void {
  let abort: AbortController | null = null

  const stop = () => {
    abort?.abort()
    abort = null
  }

  const onIdle = () => {
    stop()
    if (!canPrefetch() || fetched.size >= SESSION_LIMIT) return
    const b = map.getBounds()
    const bounds = { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() }
    const urls: string[] = []
    for (const id of Object.keys(map.getStyle()?.sources ?? {})) {
      const source = map.getSource(id) as VectorSourceLike | undefined
      const template = source?.type === 'vector' ? source.tiles?.[0] : undefined
      if (!template) continue
      for (const t of tilesAround(bounds, map.getZoom(), source?.minzoom, source?.maxzoom)) {
        const url = tileUrl(template, t, source?.scheme)
        if (!fetched.has(url) && !urls.includes(url)) urls.push(url)
      }
    }
    const queue = urls.slice(0, Math.min(PER_IDLE, SESSION_LIMIT - fetched.size))
    if (queue.length === 0) return

    const controller = new AbortController()
    abort = controller
    const worker = async () => {
      while (!controller.signal.aborted) {
        const url = queue.shift()
        if (!url) return
        fetched.add(url)
        try {
          const res = await fetcher(url, { signal: controller.signal, priority: 'low' } as RequestInit)
          // Read to the end so the service worker's copy is complete.
          if (res.ok) await res.arrayBuffer()
          else fetched.delete(url)
        } catch {
          fetched.delete(url)
          // Moved (aborted) or a bad signal: the map loads it normally if the person goes there.
          return
        }
      }
    }
    for (let i = 0; i < PARALLEL; i++) void worker()
  }

  map.on('idle', onIdle)
  map.on('movestart', stop)
  return () => {
    map.off('idle', onIdle)
    map.off('movestart', stop)
    stop()
  }
}
