import { createContext, useContext } from 'react'
import type { Position } from '../rules/nearby.ts'
import type { PlacedAddress } from './address.ts'

// locating: waiting for the first fix (or a refresh). ready: we have a position.
// denied: the person said no. unavailable: no GPS in this browser. error: GPS failed (timeout, no signal).
export type LocationStatus = 'locating' | 'ready' | 'denied' | 'unavailable' | 'error'

export interface PhoneLocation {
  status: LocationStatus
  position: Position | null
  updatedAt: number | null // ms since epoch of the last fix
  // Barangay, municipality, province and postcode for where the phone is, when it could be looked up.
  address: PlacedAddress | null
  refresh: () => void
}

// Without a provider (unit tests of a single page), there is simply no GPS.
export const LocationContext = createContext<PhoneLocation>({
  status: 'unavailable',
  position: null,
  updatedAt: null,
  address: null,
  refresh: () => {},
})

export function usePhoneLocation(): PhoneLocation {
  return useContext(LocationContext)
}
