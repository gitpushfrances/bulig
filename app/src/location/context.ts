import { createContext, useContext } from 'react'
import type { Position } from '../rules/nearby.ts'

// locating: waiting for the first fix (or a refresh). ready: we have a position.
// denied: the person said no. unavailable: no GPS in this browser. error: GPS failed (timeout, no signal).
export type LocationStatus = 'locating' | 'ready' | 'denied' | 'unavailable' | 'error'

export interface PhoneLocation {
  status: LocationStatus
  position: Position | null
  updatedAt: number | null // ms since epoch of the last fix
  refresh: () => void
}

// Without a provider (unit tests of a single page), there is simply no GPS.
export const LocationContext = createContext<PhoneLocation>({
  status: 'unavailable',
  position: null,
  updatedAt: null,
  refresh: () => {},
})

export function usePhoneLocation(): PhoneLocation {
  return useContext(LocationContext)
}
