import { describe, expect, it, vi } from 'vitest'
import { fetchRoute, formatDuration } from './route.ts'

const FROM = { lat: 10.3157, lng: 123.8854 }
const TO = { lat: 10.31, lng: 123.899 }

describe('fetchRoute', () => {
  it('asks the free OSM router for the road path, distance and time', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        Response.json({
          code: 'Ok',
          routes: [{ distance: 2580, duration: 318, geometry: { coordinates: [[123.8854, 10.3157], [123.899, 10.31]] } }],
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const route = await fetchRoute(FROM, TO, 'car')
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe(
      'https://routing.openstreetmap.de/routed-car/route/v1/driving/123.88540,10.31570;123.89900,10.31000?overview=full&geometries=geojson&steps=false',
    )
    expect(route).toEqual({ path: [[123.8854, 10.3157], [123.899, 10.31]], metres: 2580, seconds: 318 })
  })

  it('walks with the foot profile', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(Response.json({ code: 'Ok', routes: [{ distance: 1, duration: 1, geometry: { coordinates: [[0, 0]] } }] })),
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchRoute(FROM, TO, 'foot')
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('/routed-foot/')
  })

  it('fails when there is no route', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json({ code: 'NoRoute', routes: [] }))))
    await expect(fetchRoute(FROM, TO, 'car')).rejects.toThrow('no route')
  })
})

describe('formatDuration', () => {
  it.each([
    [20, '1 min'],
    [318, '5 min'],
    [3540, '59 min'],
    [3900, '1 h 05 min'],
  ])('%i seconds reads %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text)
  })
})
