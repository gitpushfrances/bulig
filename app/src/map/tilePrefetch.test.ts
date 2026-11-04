import { afterEach, describe, expect, it, vi } from 'vitest'
import { canPrefetch, prefetchTiles, resetPrefetch, tileUrl, tilesAround } from './tilePrefetch.ts'

// Guiuan town centre, about one phone screen at zoom 14.
const GUIUAN = { west: 125.715, south: 11.025, east: 125.735, north: 11.045 }

afterEach(() => resetPrefetch())

describe('tilesAround', () => {
  it('rings the screen at the current tile zoom, then the screen one zoom out', () => {
    const tiles = tilesAround(GUIUAN, 14.6)
    const z14 = tiles.filter((t) => t.z === 14)
    const z13 = tiles.filter((t) => t.z === 13)
    expect(z14.length).toBeGreaterThan(0)
    expect(z13.length).toBeGreaterThan(0)
    expect(tiles.every((t) => t.z === 14 || t.z === 13)).toBe(true)
    // Ring first, parents after.
    expect(tiles.findIndex((t) => t.z === 13)).toBe(z14.length)
    expect(tiles.length).toBeLessThanOrEqual(40)
    // The screen's own tiles are what MapLibre is already loading.
    const cx = Math.floor(((125.725 + 180) / 360) * 2 ** 14)
    const lat = (11.035 * Math.PI) / 180
    const cy = Math.floor(((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * 2 ** 14)
    expect(z14.some((t) => t.x === cx && t.y === cy)).toBe(false)
    expect(z14.some((t) => Math.abs(t.x - cx) <= 2 && Math.abs(t.y - cy) <= 2)).toBe(true)
  })

  it('never asks for zooms the source does not have', () => {
    expect(tilesAround(GUIUAN, 17).every((t) => t.z <= 14)).toBe(true)
    expect(tilesAround(GUIUAN, 0.5, 0, 14).every((t) => t.z === 0)).toBe(true)
  })

  it('puts the nearest ring tiles first', () => {
    const z14 = tilesAround(GUIUAN, 14).filter((t) => t.z === 14)
    const xs = z14.map((t) => t.x)
    const ys = z14.map((t) => t.y)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2
    const d = z14.map((t) => Math.hypot(t.x - cx, t.y - cy))
    expect(d).toEqual([...d].sort((a, b) => a - b))
  })
})

describe('tileUrl', () => {
  it('fills the template, flipping y for TMS sources', () => {
    expect(tileUrl('https://t/{z}/{x}/{y}.pbf', { z: 2, x: 1, y: 0 })).toBe('https://t/2/1/0.pbf')
    expect(tileUrl('https://t/{z}/{x}/{y}.pbf', { z: 2, x: 1, y: 0 }, 'tms')).toBe('https://t/2/1/3.pbf')
  })
})

describe('canPrefetch', () => {
  const nav = (onLine: boolean, connection?: object) => ({ onLine, connection }) as unknown as Navigator
  it('holds back offline, on Data Saver and on 2G', () => {
    expect(canPrefetch(nav(true))).toBe(true)
    expect(canPrefetch(nav(true, { effectiveType: '4g' }))).toBe(true)
    expect(canPrefetch(nav(false))).toBe(false)
    expect(canPrefetch(nav(true, { saveData: true }))).toBe(false)
    expect(canPrefetch(nav(true, { effectiveType: '2g' }))).toBe(false)
    expect(canPrefetch(nav(true, { effectiveType: 'slow-2g' }))).toBe(false)
  })
})

function fakeMap() {
  const handlers: Record<string, () => void> = {}
  return {
    handlers,
    on: vi.fn((e: string, f: () => void) => (handlers[e] = f)),
    off: vi.fn((e: string) => delete handlers[e]),
    getBounds: () => ({ getWest: () => GUIUAN.west, getSouth: () => GUIUAN.south, getEast: () => GUIUAN.east, getNorth: () => GUIUAN.north }),
    getZoom: () => 14,
    getStyle: () => ({ sources: { openmaptiles: {}, shade: {} } }),
    getSource: (id: string) =>
      id === 'openmaptiles'
        ? { type: 'vector', tiles: ['https://tiles.example/planet/v1/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 14 }
        : { type: 'raster', tiles: ['https://tiles.example/shade/{z}/{x}/{y}.png'] },
  }
}

const ok = () => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) } as Response)
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('prefetchTiles', () => {
  it('fetches vector tiles at low priority when the map settles, once each per session', async () => {
    const m = fakeMap()
    const fetcher = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(ok)
    const off = prefetchTiles(m as never, fetcher as never)
    m.handlers.idle()
    await flush()
    const first = fetcher.mock.calls.length
    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThanOrEqual(24)
    expect(new Set(fetcher.mock.calls.map((c) => c[0])).size).toBe(first)
    for (const [url, init] of fetcher.mock.calls as unknown as [string, RequestInit][]) {
      expect(url).toMatch(/^https:\/\/tiles\.example\/planet\/v1\/1[34]\/\d+\/\d+\.pbf$/)
      expect(init.priority).toBe('low')
    }
    // Same spot again: nothing new to fetch.
    m.handlers.idle()
    await flush()
    expect(fetcher.mock.calls.length).toBe(first)
    off()
    expect(m.handlers.idle).toBeUndefined()
    expect(m.handlers.movestart).toBeUndefined()
  })

  it('stops as soon as the map moves', async () => {
    const m = fakeMap()
    let signal: AbortSignal | undefined
    const fetcher = vi.fn((_: string, init: RequestInit) => {
      signal = init.signal ?? undefined
      return new Promise<Response>(() => {})
    })
    prefetchTiles(m as never, fetcher as never)
    m.handlers.idle()
    expect(signal?.aborted).toBe(false)
    m.handlers.movestart()
    expect(signal?.aborted).toBe(true)
  })

  it('tries a tile cut short by a move again at the next stop', async () => {
    const m = fakeMap()
    const fetcher = vi.fn(
      (_: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted')))),
    )
    prefetchTiles(m as never, fetcher as never)
    m.handlers.idle()
    const firstUrl = fetcher.mock.calls[0][0]
    m.handlers.movestart()
    await flush()
    fetcher.mockImplementation(ok)
    m.handlers.idle()
    await flush()
    expect(fetcher.mock.calls.filter((c) => c[0] === firstUrl).length).toBe(2)
  })

  it('does nothing offline', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const m = fakeMap()
    const fetcher = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(ok)
    prefetchTiles(m as never, fetcher as never)
    m.handlers.idle()
    await flush()
    expect(fetcher).not.toHaveBeenCalled()
    online.mockRestore()
  })
})
