import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { readSaved, writeSaved } from '../data/storage.ts'
import { distanceKm, type Position } from '../rules/nearby.ts'
import { lookUpAddress, needsLookup, type PlacedAddress } from './address.ts'
import { LocationContext, type LocationStatus } from './context.ts'

type Fix = { status: LocationStatus; position: Position | null; updatedAt: number | null }

// Coarse is enough to pick a town and rank places, and it saves battery. A fix up to a minute old
// is fine while driving; the refresh button asks for a fresh one.
const WATCH: PositionOptions = { enableHighAccuracy: false, maximumAge: 60_000, timeout: 20_000 }
const FRESH: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 }

const ADDRESS_KEY = 'bulig.address'
const STALE_KM = 2

function readAddress(): PlacedAddress | null {
  try {
    const value = JSON.parse(readSaved(ADDRESS_KEY) ?? 'null') as PlacedAddress | null
    return value && typeof value.lat === 'number' && typeof value.lng === 'number' ? value : null
  } catch {
    return null
  }
}

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
// The exact position stays on the phone. To show the street address, a rounded position (about
// 110 m) is sent to OpenStreetMap, only when online, and again only after a 250 m move or a refresh.
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
  const [address, setAddress] = useState<PlacedAddress | null>(readAddress)
  const forceLookup = useRef(false)
  const lastLookup = useRef<PlacedAddress | null>(address)

  useEffect(() => {
    if (!geo) return
    const id = geo.watchPosition(...handlers(setFix), WATCH)
    return () => geo.clearWatch(id)
  }, [geo])

  const position = fix.position
  useEffect(() => {
    if (!position || !navigator.onLine) return
    if (!forceLookup.current && !needsLookup(position, lastLookup.current)) return
    forceLookup.current = false
    const abort = new AbortController()
    lookUpAddress(position, abort.signal).then(
      (found) => {
        if (!found) return
        const next = { ...position, address: found, at: Date.now() }
        lastLookup.current = next
        setAddress(next)
        writeSaved(ADDRESS_KEY, JSON.stringify(next))
      },
      () => {}, // offline or blocked: keep the last address; the area name still shows
    )
    return () => abort.abort()
  }, [position])

  const refresh = () => {
    if (!geo) return
    forceLookup.current = true
    setFix((f) => ({ ...f, status: 'locating' }))
    geo.getCurrentPosition(...handlers(setFix), FRESH)
  }

  // The last address stays up while the phone is within 2 km of it (no flicker between lookups),
  // and the cached one shows while the first fix comes in. Far away or denied, there is none.
  const current =
    address && (position ? distanceKm(position, address) < STALE_KM : fix.status === 'locating') ? address : null

  return (
    <LocationContext.Provider value={{ ...fix, address: current, refresh }}>{children}</LocationContext.Provider>
  )
}
