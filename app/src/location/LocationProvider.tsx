import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { LocationContext, type LocationStatus } from './context.ts'
import type { Position } from '../rules/nearby.ts'

type Fix = { status: LocationStatus; position: Position | null; updatedAt: number | null }

// Coarse is enough to pick a town and rank places, and it saves battery. A fix up to a minute old
// is fine while driving; the refresh button asks for a fresh one.
const WATCH: PositionOptions = { enableHighAccuracy: false, maximumAge: 60_000, timeout: 20_000 }
const FRESH: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 }

// Success and failure handlers for both the watch and a manual refresh.
function handlers(setFix: Dispatch<SetStateAction<Fix>>) {
  const onFix = (p: GeolocationPosition) =>
    setFix({ status: 'ready', position: { lat: p.coords.latitude, lng: p.coords.longitude }, updatedAt: Date.now() })
  // A failed refresh keeps the last good position; only "denied" drops it.
  const onFail = (e: GeolocationPositionError) =>
    setFix((f) =>
      e.code === 1 // PERMISSION_DENIED
        ? { status: 'denied', position: null, updatedAt: null }
        : { ...f, status: f.position ? 'ready' : 'error' },
    )
  return [onFix, onFail] as const
}

// Follows the phone while the app is open (watchPosition), so the area updates as the driver moves.
// The position never leaves the phone.
export default function LocationProvider({
  children,
  geo = typeof navigator === 'undefined' ? undefined : navigator.geolocation,
}: {
  children: ReactNode
  geo?: Geolocation
}) {
  const [fix, setFix] = useState<Fix>(() => ({
    status: geo ? 'locating' : 'unavailable',
    position: null,
    updatedAt: null,
  }))

  useEffect(() => {
    if (!geo) return
    const id = geo.watchPosition(...handlers(setFix), WATCH)
    return () => geo.clearWatch(id)
  }, [geo])

  const refresh = () => {
    if (!geo) return
    setFix((f) => ({ ...f, status: 'locating' }))
    geo.getCurrentPosition(...handlers(setFix), FRESH)
  }

  return <LocationContext.Provider value={{ ...fix, refresh }}>{children}</LocationContext.Provider>
}
