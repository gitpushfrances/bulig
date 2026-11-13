import { describe, expect, it } from 'vitest'
import { boxOfCell, cellOf, cellsAround, cellsInBox } from './cells.ts'

describe('map squares', () => {
  it('snaps a point to the 0.25° square it is in', () => {
    expect(cellOf(11.03, 125.72)).toBe('44,502')
    expect(boxOfCell('44,502')).toEqual([125.5, 11, 125.75, 11.25])
  })

  it('lists the square around a point and its 8 neighbours', () => {
    expect(cellsAround(11.03, 125.72)).toHaveLength(9)
    expect(cellsAround(11.03, 125.72)).toContain('43,501')
  })

  it('covers a map view, or nothing when it is zoomed out too far', () => {
    expect(cellsInBox([125.6, 11.0, 125.8, 11.1])).toEqual(['44,502', '44,503'])
    expect(cellsInBox([117, 5, 127, 21])).toEqual([])
  })
})
