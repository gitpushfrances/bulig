import { describe, expect, it } from 'vitest'
import { clusterLabel, onScreen, type SourceFeature } from './visiblePlaces.ts'

const place = (id: string, lng: number, lat: number): SourceFeature => ({ properties: { id }, geometry: { type: 'Point', coordinates: [lng, lat] } })
const group = (clusterId: number, count: number, lng: number, lat: number): SourceFeature => ({
  properties: { cluster: true, cluster_id: clusterId, point_count: count },
  geometry: { type: 'Point', coordinates: [lng, lat] },
})

// Around Guiuan.
const VIEW: [[number, number], [number, number]] = [
  [125.7, 11.0],
  [125.8, 11.1],
]

describe('onScreen', () => {
  it('keeps the places and groups inside the view, each once', () => {
    const result = onScreen([place('a', 125.72, 11.03), place('a', 125.72, 11.03), group(7, 40, 125.75, 11.05), group(7, 40, 125.75, 11.05), place('manila', 121.0, 14.6)], VIEW)
    expect(result).toEqual({ places: ['a'], clusters: [{ clusterId: 7, count: 40, lng: 125.75, lat: 11.05 }] })
  })

  it('keeps a place just past the edge, so it does not pop in while panning', () => {
    expect(onScreen([place('edge', 125.805, 11.05)], VIEW).places).toEqual(['edge'])
  })

  it('draws at most the cap, and always the open place', () => {
    const many = Array.from({ length: 10 }, (_, i) => place(`p${i}`, 125.75, 11.05))
    const result = onScreen([...many, place('open', 125.71, 11.01)], VIEW, 'open', 3)
    expect(result.places).toEqual(['p0', 'p1', 'p2', 'open'])
  })

  it('ignores anything that is not a point', () => {
    expect(onScreen([{ properties: { id: 'x' }, geometry: { type: 'LineString', coordinates: [] } }], VIEW).places).toEqual([])
  })
})

describe('clusterLabel', () => {
  it.each([
    [7, '7'],
    [999, '999'],
    [1000, '1k'],
    [1250, '1.2k'],
    [35400, '35k'],
  ])('%i → %s', (count, label) => {
    expect(clusterLabel(count)).toBe(label)
  })
})
