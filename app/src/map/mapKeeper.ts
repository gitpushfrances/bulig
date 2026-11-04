import type { Map as MapLibreMap } from 'maplibre-gl'

// Keeps the Map tab's map alive between visits.
//
// Before, leaving the Map destroyed the map: going back meant a new WebGL context, the style
// parsed again, every tile decoded again and a blank panel for a second or more, even with the
// tiles in the service worker's cache. Now the map is made once per app session. Leaving the tab
// only lifts its element out of the page; coming back puts it back, resizes it and it is ready at
// once, at the same view, with the route still drawn.
//
// The last view (centre and zoom) is also saved on the phone, so the first map of a new session
// opens where the person last looked instead of on the whole Philippines (which also used to load
// country-wide tiles before jumping to the person).

export interface KeptMap {
  map: MapLibreMap
  lib: typeof import('maplibre-gl')
  // MapLibre's container. It moves in and out of the Map page's box.
  element: HTMLDivElement
  // The first full draw has happened (a visit can end before it does).
  loaded: boolean
  // What the view has been fitted to so far this session. A GPS fix still moves an area view to
  // the person once; after that the view is the person's (following, or wherever they dragged it).
  fitted: 'none' | 'area' | 'person'
  // Whether the map follows the person (off once they drag it), kept across visits.
  following: boolean
  // The colours the map is painted in, so a visit only repaints when the app theme changed.
  theme: 'light' | 'dark'
}

let kept: KeptMap | null = null

export function keptMap(): KeptMap | null {
  return kept
}

export function keepMap(value: KeptMap): void {
  kept = value
}

// Try again, or a map that broke: throw it away so the next visit makes a fresh one.
export function dropMap(): void {
  if (!kept) return
  try {
    kept.map.remove()
  } catch {
    // Already gone with its WebGL context; nothing to free.
  }
  kept.element.remove()
  kept = null
}

// Puts the kept map's element into `box` and makes MapLibre measure the new size.
export function attachMap(value: KeptMap, box: HTMLElement): void {
  if (value.element.parentElement !== box) box.appendChild(value.element)
  value.map.resize()
}

// Takes the element out of the page; the map, its tiles and its layers stay in memory.
export function detachMap(value: KeptMap): void {
  value.element.remove()
}

// ---------- The last view, for the next session ----------

export interface MapView {
  lng: number
  lat: number
  zoom: number
}

const VIEW_KEY = 'bulig.mapView'

// Only views inside the Philippines (with a margin) and at a useful zoom are worth reopening.
export function validView(v: unknown): v is MapView {
  if (typeof v !== 'object' || v === null) return false
  const { lng, lat, zoom } = v as Record<string, unknown>
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    typeof zoom === 'number' &&
    lng >= 114 &&
    lng <= 129 &&
    lat >= 3 &&
    lat <= 23 &&
    zoom >= 5 &&
    zoom <= 20
  )
}

export function readView(): MapView | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null')
    return validView(value) ? value : null
  } catch {
    return null
  }
}

export function saveView(view: MapView): void {
  if (!validView(view)) return
  try {
    localStorage.setItem(
      VIEW_KEY,
      // Rounded to about 100 m: enough to reopen the same streets, not a precise trace of the person.
      JSON.stringify({ lng: +view.lng.toFixed(3), lat: +view.lat.toFixed(3), zoom: +view.zoom.toFixed(1) }),
    )
  } catch {
    // Storage blocked: the next session opens on the person or the area instead.
  }
}
