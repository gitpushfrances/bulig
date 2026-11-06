import type { Map as MapLibreMap } from 'maplibre-gl'
import { describe, expect, it, vi } from 'vitest'
import { applyMapTheme } from './mapTheme.ts'

describe('applyMapTheme', () => {
  it("leaves the app's own layers (route line, Nearby ring) alone", () => {
    const setPaintProperty = vi.fn()
    const map = {
      getStyle: () => ({
        layers: [
          { id: 'road_minor', type: 'line' },
          { id: 'route-casing', type: 'line' },
          { id: 'route-line', type: 'line' },
          { id: 'nearby-ring-fill', type: 'fill' },
          { id: 'nearby-ring-line', type: 'line' },
        ],
      }),
      setPaintProperty,
      setLayoutProperty: vi.fn(),
    } as unknown as MapLibreMap

    applyMapTheme(map, 'dark')

    const touched = new Set(setPaintProperty.mock.calls.map(([id]) => id))
    expect(touched).toEqual(new Set(['road_minor']))
  })
})
