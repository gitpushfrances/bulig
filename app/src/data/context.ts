import { createContext, useContext, useLayoutEffect } from 'react'
import type { Area, AreaId, CountryCode, EmergencyContact, Labels, Service } from '../types.ts'
import type { Box } from './cells.ts'

export type DataState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | {
      status: 'ready'
      areas: Area[]
      emergency: EmergencyContact[]
      // The places loaded so far this session (around the person, the map views, saved places), not the country.
      services: Service[]
      labels: Labels | null
    }

export interface AppData {
  country: CountryCode
  data: DataState
  // From GPS when there is a fix (the nearest listed area), else the last area picked or found.
  // null = all areas.
  area: AreaId | null
  // How far the phone is from that area's centre, when the area came from GPS.
  areaKm: number | null
  // Manual choice, used only while there is no GPS fix.
  setArea: (area: AreaId | null) => void
  online: boolean
  // The server didn't answer and these are the bundled files (it is being tried again). Records that
  // live only on the server, such as saved places, may be missing for now.
  fromBackup?: boolean
  retry: () => void
  // Load the places in a map view (by 0.25° square) or by ID; already-loaded ones are not asked again.
  ensurePlaces: (req: { box?: Box; ids?: string[] }) => void
  // IDs the server said it doesn't list (removed, hidden, or never existed).
  missingPlaces: ReadonlySet<string>
  // Some place request is still on its way.
  loadingPlaces: boolean
  // The places around the person (or the picked town) for where they are now haven't answered yet.
  nearLoading: boolean
}

export const AppDataContext = createContext<AppData | null>(null)

export function useAppData(): AppData {
  const value = useContext(AppDataContext)
  if (!value) throw new Error('useAppData must be used inside <DataProvider>')
  return value
}

// Make sure these places are loaded (saved hearts, a shared link), by ID. Safe to call on every render.
// A layout effect, so the request is on its way before the first paint: no flash of "not found".
export function usePlaceIds(ids: readonly string[]): void {
  const { ensurePlaces } = useAppData()
  const key = ids.join(',')
  useLayoutEffect(() => {
    if (key) ensurePlaces({ ids: key.split(',') })
  }, [key, ensurePlaces])
}
