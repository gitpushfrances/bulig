import type { MapScope } from './mapScope.ts'
import type { TravelMode } from './route.ts'

// What the Map keeps for this browser session (sessionStorage): the route in progress, so leaving
// the Map doesn't lose it, and Nearby or All, so coming back keeps the choice. Signing out clears
// both (auth/forgetOnSignOut.ts).
export const ROUTE_KEY = 'bulig.route'
export const SCOPE_KEY = 'bulig.mapScope'

export interface SavedRoute {
  to: string
  mode: TravelMode
}

export function readRoute(): SavedRoute | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(ROUTE_KEY) ?? 'null') as SavedRoute | null
    return value && typeof value.to === 'string' ? { to: value.to, mode: value.mode === 'foot' ? 'foot' : 'car' } : null
  } catch {
    return null
  }
}

export function saveRoute(value: SavedRoute | null) {
  try {
    if (value) sessionStorage.setItem(ROUTE_KEY, JSON.stringify(value))
    else sessionStorage.removeItem(ROUTE_KEY)
  } catch {
    // Private mode or blocked storage: the route just won't survive leaving the Map.
  }
}

export function readScope(): MapScope {
  try {
    return sessionStorage.getItem(SCOPE_KEY) === 'all' ? 'all' : 'nearby'
  } catch {
    return 'nearby'
  }
}

export function saveScope(value: MapScope) {
  try {
    sessionStorage.setItem(SCOPE_KEY, value)
  } catch {
    // Blocked storage: the Map opens on Nearby next time.
  }
}
