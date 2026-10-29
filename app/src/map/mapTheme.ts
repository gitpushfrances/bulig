import type { Map as MapLibreMap } from 'maplibre-gl'

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

// Recolours every layer of the style by what it draws. Safe to call again on a theme change.
export function applyMapTheme(map: MapLibreMap, mode: 'light' | 'dark') {
  const p = PALETTES[mode]
  const set = (layer: string, property: string, value: string) => {
    try {
      map.setPaintProperty(layer, property, value)
    } catch {
      // A layer without this property (a pattern fill, an icon-only symbol) keeps its own.
    }
  }

  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase()
    switch (layer.type) {
      case 'background':
        set(layer.id, 'background-color', p.land)
        break
      case 'fill': {
        const colour = has(id, /water|ocean|lake/)
          ? p.water
          : has(id, /park|wood|grass|forest|green|landcover|wetland/)
            ? p.park
            : has(id, /building/)
              ? p.building
              : p.landAlt
        set(layer.id, 'fill-color', colour)
        // The style draws its own outlines (light ones, made for a white map): match the fill.
        set(layer.id, 'fill-outline-color', has(id, /building/) ? p.roadCasing : colour)
        break
      }
      case 'line':
        if (has(id, /water|river|stream|canal/)) set(layer.id, 'line-color', p.water)
        else if (has(id, /boundary|admin/)) set(layer.id, 'line-color', p.boundary)
        else if (has(id, /casing/)) set(layer.id, 'line-color', p.roadCasing)
        else if (has(id, /motorway|trunk|primary|major/)) set(layer.id, 'line-color', p.roadMajor)
        else if (has(id, /road|highway|street|minor|path|bridge|tunnel|rail|transport|aeroway/))
          set(layer.id, 'line-color', p.road)
        break
      case 'symbol':
        set(layer.id, 'text-color', has(id, /water|ocean|sea|lake/) ? p.waterLabel : p.label)
        set(layer.id, 'text-halo-color', p.halo)
        break
    }
  }
}
