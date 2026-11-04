import type { LayerSpecification, Map as MapLibreMap, MapOptions, StyleSpecification } from 'maplibre-gl'

// Free map tiles: OpenFreeMap (no key, no account, no usage fees), drawn by MapLibre GL.
// Data © OpenMapTiles © OpenStreetMap contributors; the style carries the attribution.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

// Graphite for the map. MapLibre paints with raw colours, so these mirror the zinc scale in
// index.css: light and dark greys, roads that read at a glance, water a touch cooler than land.
interface MapPalette {
  land: string
  landAlt: string
  park: string
  water: string
  building: string
  road: string
  roadMajor: string
  roadCasing: string
  boundary: string
  label: string
  waterLabel: string
  halo: string
}

const PALETTES: Record<'light' | 'dark', MapPalette> = {
  light: {
    land: '#f4f4f5',
    landAlt: '#efeff1',
    park: '#e9ebe7',
    water: '#dde3ea',
    building: '#e4e4e7',
    road: '#ffffff',
    roadMajor: '#ffffff',
    roadCasing: '#d4d4d8',
    boundary: '#a1a1aa',
    label: '#52525b',
    waterLabel: '#71717a',
    halo: '#f4f4f5',
  },
  dark: {
    land: '#18181b',
    landAlt: '#1c1c20',
    park: '#1b1e1b',
    water: '#0e1116',
    building: '#232327',
    road: '#2c2c31',
    roadMajor: '#3f3f46',
    roadCasing: '#18181b',
    boundary: '#52525b',
    label: '#a1a1aa',
    waterLabel: '#71717a',
    halo: '#18181b',
  },
}

const has = (id: string, pattern: RegExp) => pattern.test(id)

// The credit the licences require (OpenFreeMap, OpenMapTiles CC-BY, OpenStreetMap ODbL). Shown as one
// line of small text on every map instead of MapLibre's "i" button and pop-up.
export const MAP_CREDIT = { text: '© OpenMapTiles © OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' }

// Layers Bulig never needs: other businesses' icons and names (they compete with our pins), house
// numbers, airport details. Fewer layers = less to download, place and draw on a cheap phone.
const HIDDEN = /poi|housenumber|aeroway|aerodrome|shield|oneway|ferry/

// Lighter drawing for low-cost phones: at most 2x pixels (3x screens draw 2.25x more for nothing a
// driver can see), no fade-in on tiles and labels, no tilt, one copy of the world.
export function mapRenderOptions(): Partial<MapOptions> {
  return {
    pixelRatio: Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2),
    fadeDuration: 0,
    maxPitch: 0,
    renderWorldCopies: false,
    refreshExpiredTiles: false,
    attributionControl: false,
  }
}

// One layer's colours (and whether it shows) for the palette. Shared by the first load (the style is
// themed before MapLibre sees it, so there is no flash of the stock colours) and theme changes.
function themeLayer(layer: LayerSpecification, p: MapPalette): { paint: Record<string, string>; hidden: boolean } {
  const id = layer.id.toLowerCase()
  const paint: Record<string, string> = {}
  if (layer.type === 'symbol' && HIDDEN.test(id)) return { paint, hidden: true }
  if (layer.type !== 'symbol' && /aeroway|ferry/.test(id)) return { paint, hidden: true }
  switch (layer.type) {
    case 'background':
      paint['background-color'] = p.land
      break
    case 'fill': {
      const colour = has(id, /water|ocean|lake/)
        ? p.water
        : has(id, /park|wood|grass|forest|green|landcover|wetland/)
          ? p.park
          : has(id, /building/)
            ? p.building
            : p.landAlt
      paint['fill-color'] = colour
      // The style draws its own outlines (light ones, made for a white map): match the fill.
      paint['fill-outline-color'] = has(id, /building/) ? p.roadCasing : colour
      break
    }
    case 'line':
      if (has(id, /water|river|stream|canal/)) paint['line-color'] = p.water
      else if (has(id, /boundary|admin/)) paint['line-color'] = p.boundary
      else if (has(id, /casing/)) paint['line-color'] = p.roadCasing
      else if (has(id, /motorway|trunk|primary|major/)) paint['line-color'] = p.roadMajor
      else if (has(id, /road|highway|street|minor|path|bridge|tunnel|rail|transport/)) paint['line-color'] = p.road
      break
    case 'symbol':
      paint['text-color'] = has(id, /water|ocean|sea|lake/) ? p.waterLabel : p.label
      paint['text-halo-color'] = p.halo
      break
  }
  return { paint, hidden: false }
}

// The OpenFreeMap style, already in Bulig's colours and without the hidden layers. The service worker
// keeps the style file (vite.config.ts), so after the first visit this costs no download.
export async function themedStyle(mode: 'light' | 'dark', signal?: AbortSignal): Promise<StyleSpecification> {
  const res = await fetch(MAP_STYLE_URL, { signal })
  if (!res.ok) throw new Error(`style ${res.status}`)
  const style = (await res.json()) as StyleSpecification
  const p = PALETTES[mode]
  style.layers = style.layers.flatMap((layer) => {
    const { paint, hidden } = themeLayer(layer, p)
    if (hidden) return []
    if (layer.type === 'background' || layer.type === 'fill' || layer.type === 'line' || layer.type === 'symbol') {
      return [{ ...layer, paint: { ...(layer.paint ?? {}), ...paint } } as LayerSpecification]
    }
    return [layer]
  })
  return style
}

// Recolours every layer of the style by what it draws, on a theme change while the map is open.
export function applyMapTheme(map: MapLibreMap, mode: 'light' | 'dark') {
  const p = PALETTES[mode]
  for (const layer of map.getStyle().layers ?? []) {
    const { paint, hidden } = themeLayer(layer, p)
    if (hidden) {
      map.setLayoutProperty(layer.id, 'visibility', 'none')
      continue
    }
    for (const [property, value] of Object.entries(paint)) {
      try {
        map.setPaintProperty(layer.id, property, value)
      } catch {
        // A layer without this property (a pattern fill, an icon-only symbol) keeps its own.
      }
    }
  }
}
