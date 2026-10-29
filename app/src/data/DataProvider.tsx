import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { AreaId, CountryCode } from '../types.ts'
import { AppDataContext, type DataState } from './context.ts'
import { pickCountry } from './countries.ts'
import type { DataSource } from './DataSource.ts'
import { jsonSource } from './JsonSource.ts'
import { usePhoneLocation } from '../location/context.ts'
import { nearestArea } from '../rules/nearby.ts'
import { readSaved, writeSaved } from './storage.ts'

const AREA_KEY = 'bulig.area'
const COUNTRY_KEY = 'bulig.country'

function subscribeOnline(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

// Loads the picked country's data once for the whole app, and remembers the picked area.
export default function DataProvider({
  children,
  source = jsonSource,
}: {
  children: ReactNode
  source?: DataSource
}) {
  const [country] = useState<CountryCode>(() => pickCountry(readSaved(COUNTRY_KEY), navigator.languages ?? []))
  const [savedArea, setSavedArea] = useState<AreaId | null>(() => readSaved(AREA_KEY))
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{ key: string; data: DataState } | null>(null)
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine)
  const { position } = usePhoneLocation()

  const key = `${country}#${attempt}`
  useEffect(() => {
    let live = true
    Promise.all([
      source.areas(country),
      source.emergencyContacts(country),
      source.services(country),
      source.labels(country).catch(() => null), // missing labels only means English defaults
    ]).then(
      ([areas, emergency, services, labels]) => {
        if (live)
          setLoaded({
            key,
            data: { status: 'ready', areas: areas.items, emergency: emergency.items, services: services.items, labels },
          })
      },
      (err: unknown) => {
        if (live) setLoaded({ key, data: { status: 'error', error: err instanceof Error ? err.message : String(err) } })
      },
    )
    return () => {
      live = false
    }
  }, [country, source, key])

  const data: DataState = loaded?.key === key ? loaded.data : { status: 'loading' }
  // GPS wins. Without a fix, a saved area that no longer exists (renamed, removed) falls back to "all areas".
  const nearest = data.status === 'ready' && position ? nearestArea(position, data.areas) : null
  const area = nearest
    ? nearest.area.id
    : data.status === 'ready' && data.areas.some((a) => a.id === savedArea)
      ? savedArea
      : null

  // Remember the last area GPS found, so the next offline open starts there.
  const nearestId = nearest?.area.id
  useEffect(() => {
    if (nearestId) writeSaved(AREA_KEY, nearestId)
  }, [nearestId])

  const setArea = (next: AreaId | null) => {
    setSavedArea(next)
    writeSaved(AREA_KEY, next)
  }

  return (
    <AppDataContext.Provider
      value={{
        country,
        data,
        area,
        areaKm: nearest?.km ?? null,
        setArea,
        online,
        retry: () => setAttempt((n) => n + 1),
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}
