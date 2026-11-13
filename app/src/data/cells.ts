// The app reads places in fixed map squares (API.md §3.3, bbox), never the whole country: 0.25° a side
// (about 28 km), corners on multiples of 0.25. The same square is the same URL on every phone, so the
// server, Cloudflare and the service worker can all cache it.

export const CELL_DEGREES = 0.25

// Most squares one map view may ask for at once. Past this the view is zoomed out too far to need them.
export const MAX_VIEW_CELLS = 24

export type Box = [west: number, south: number, east: number, north: number]

const snap = (n: number) => Math.floor(n / CELL_DEGREES)
const round = (n: number) => Math.round(n * 1000) / 1000

// "lat,lng" of the square's south-west corner, in steps: "44,502" is 11.00°N 125.50°E.
export function cellOf(lat: number, lng: number): string {
  return `${snap(lat)},${snap(lng)}`
}

export function boxOfCell(cell: string): Box {
  const [y, x] = cell.split(',').map(Number)
  return [round(x * CELL_DEGREES), round(y * CELL_DEGREES), round((x + 1) * CELL_DEGREES), round((y + 1) * CELL_DEGREES)]
}

// The square around a point and the ones touching it: about 83 km across, wider than any "near me".
export function cellsAround(lat: number, lng: number, ring = 1): string[] {
  const y0 = snap(lat)
  const x0 = snap(lng)
  const cells: string[] = []
  for (let y = y0 - ring; y <= y0 + ring; y++) for (let x = x0 - ring; x <= x0 + ring; x++) cells.push(`${y},${x}`)
  return cells
}

// The squares a map view covers, or [] when it covers more than `max` (zoomed out too far).
export function cellsInBox([west, south, east, north]: Box, max = MAX_VIEW_CELLS): string[] {
  const ys = [snap(south), snap(north)]
  const xs = [snap(west), snap(east)]
  if ((ys[1] - ys[0] + 1) * (xs[1] - xs[0] + 1) > max) return []
  const cells: string[] = []
  for (let y = ys[0]; y <= ys[1]; y++) for (let x = xs[0]; x <= xs[1]; x++) cells.push(`${y},${x}`)
  return cells
}
