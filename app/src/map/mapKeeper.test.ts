import { afterEach, describe, expect, it, vi } from 'vitest'
import { attachMap, detachMap, dropMap, keepMap, keptMap, readView, saveView, validView, type KeptMap } from './mapKeeper.ts'

function fakeKept(): KeptMap {
  const element = document.createElement('div')
  return {
    map: { resize: vi.fn(), remove: vi.fn() } as unknown as KeptMap['map'],
    lib: {} as KeptMap['lib'],
    element,
    loaded: true,
    fitted: 'person',
    following: true,
    theme: 'light',
  }
}

afterEach(() => {
  dropMap()
  localStorage.clear()
})

describe('keeping the map between visits', () => {
  it('moves the same map into the page and out again, without destroying it', () => {
    const k = fakeKept()
    keepMap(k)
    const first = document.createElement('div')
    document.body.appendChild(first)

    attachMap(k, first)
    expect(k.element.parentElement).toBe(first)
    expect(k.map.resize).toHaveBeenCalledTimes(1)

    detachMap(k)
    expect(k.element.isConnected).toBe(false)
    expect(k.map.remove).not.toHaveBeenCalled()
    expect(keptMap()).toBe(k)

    // The next visit gets a new box; the map moves into it.
    const second = document.createElement('div')
    document.body.appendChild(second)
    attachMap(k, second)
    expect(k.element.parentElement).toBe(second)
    expect(k.map.resize).toHaveBeenCalledTimes(2)
  })

  it('throws the map away on Try again, so the next visit makes a fresh one', () => {
    const k = fakeKept()
    keepMap(k)
    dropMap()
    expect(k.map.remove).toHaveBeenCalled()
    expect(keptMap()).toBeNull()
  })
})

describe('the last view', () => {
  it('reopens where the person last looked, rounded to about 100 m', () => {
    saveView({ lng: 125.72281, lat: 11.03532, zoom: 14.237 })
    expect(readView()).toEqual({ lng: 125.723, lat: 11.035, zoom: 14.2 })
  })

  it('ignores views outside the Philippines, odd zooms and broken storage', () => {
    expect(validView({ lng: 0, lat: 0, zoom: 10 })).toBe(false)
    expect(validView({ lng: 125, lat: 11, zoom: 2 })).toBe(false)
    expect(validView('nope')).toBe(false)
    saveView({ lng: 0, lat: 0, zoom: 10 })
    expect(readView()).toBeNull()
    localStorage.setItem('bulig.mapView', '{not json')
    expect(readView()).toBeNull()
  })
})
