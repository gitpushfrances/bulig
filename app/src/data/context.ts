import { createContext, useContext } from 'react'
import type { Area, AreaId, CountryCode, EmergencyContact, Labels, Service } from '../types.ts'

export type DataState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | {
      status: 'ready'
      areas: Area[]
      emergency: EmergencyContact[]
      services: Service[]
      labels: Labels | null
    }

export interface AppData {
  country: CountryCode
  data: DataState
  area: AreaId | null // null = all areas
  setArea: (area: AreaId | null) => void
  online: boolean
  retry: () => void
}

export const AppDataContext = createContext<AppData | null>(null)

export function useAppData(): AppData {
  const value = useContext(AppDataContext)
  if (!value) throw new Error('useAppData must be used inside <DataProvider>')
  return value
}
