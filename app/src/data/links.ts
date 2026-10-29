import type { Service } from '../types.ts'

// In-app links to a place: its details page, and its route on the Map (when it has a location).
export const placeHref = (s: Service) => `/place/${encodeURIComponent(s.id)}`

export const routeHref = (s: Service) =>
  s.lat !== undefined && s.lng !== undefined ? `/map?to=${encodeURIComponent(s.id)}` : null
