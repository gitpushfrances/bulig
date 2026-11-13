import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useLocation } from 'react-router'
import { readSaved, writeSaved } from '../data/storage.ts'
import { whenSplashGone } from '../splash.ts'
import { distanceKm, type Position } from '../rules/nearby.ts'
import { ADDRESS_KEY, lookUpAddress, needsLookup, type PlacedAddress } from './address.ts'
import { fromGeolocation, keepFix, type GpsFix } from './fixes.ts'
import { LocationContext, type LocationStatus } from './context.ts'

type Fix = { status: LocationStatus; position: Position | null; accuracy: number | null; updatedAt: number | null }

// Live while the app is open (John, 2026-11-04): GPS-accurate so the blue dot moves with the driver,
// a fix at most LIVE_MS old, and the app takes a new one at most every LIVE_MS. Reading GPS sends
// nothing anywhere; the street-address lookup (OpenStreetMap) stays limited to a 250 m move.
// Battery: GPS stays on only while Bulig is on screen (browsers stop it in the background).
const LIVE_MS = 3_000
const WATCH: PositionOptions = { enableHighAccuracy: true, maximumAge: LIVE_MS, timeout: 20_000 }
const FRESH: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 }

const STALE_KM = 2
const SETTLE_MS = 8_000
const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password']

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
  const onFix = (p: GpsFix) =>
    setFix({
      status: 'ready',
      position: { lat: p.lat, lng: p.lng },
      accuracy: Number.isFinite(p.accuracy) ? Math.round(p.accuracy) : null,
      updatedAt: p.at,
    })
  // A failed refresh keeps the last good position; only "denied" drops it.
  const onFail = (e: GeolocationPositionError) =>
    setFix((f) =>
      e.code === 1 // PERMISSION_DENIED
        ? { status: 'denied', position: null, accuracy: null, updatedAt: null }
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
    accuracy: null,
    updatedAt: null,
  }))
  const [address, setAddress] = useState<PlacedAddress | null>(readAddress)
  const forceLookup = useRef(false)
  const lastLookup = useRef<PlacedAddress | null>(address)
  const [splashGone, setSplashGone] = useState(false)
  const [settleOver, setSettleOver] = useState(false)

  useEffect(() => {
    let live = true
    whenSplashGone().then(() => live && setSplashGone(true))
    return () => {
      live = false
    }
  }, [])

  // Ask only once the person is in the app: never over the splash, and never on the sign-in screens,
  // where a permission prompt would land on top of the password field.
  const onAuthScreen = AUTH_PATHS.includes(useLocation().pathname)
  const watching = !!geo && splashGone && !onAuthScreen

  useEffect(() => {
    if (!geo || !watching) return
    const [onFix, onFail] = handlers(setFix)
    // GPS can report several times a second while moving: pass on at most one fix per LIVE_MS, so
    // the map, the distances and the lists redraw calmly. The newest fix in a burst is the one passed
    // on (once the wait is over), never dropped, and rough guesses after a good fix are ignored.
    let last = 0
    let timer = 0
    let kept: GpsFix | null = null
    let latest: GpsFix | null = null
    const send = () => {
      timer = 0
      if (!latest) return
      last = Date.now()
      onFix(latest)
    }
    const id = geo.watchPosition((p) => {
      const next = fromGeolocation(p)
      if (!keepFix(kept, next)) return
      kept = next
      latest = next
      const wait = LIVE_MS - (Date.now() - last)
      if (wait <= 0) {
        window.clearTimeout(timer)
        send()
      } else if (!timer) timer = window.setTimeout(send, wait)
    }, onFail, WATCH)
    return () => {
      geo.clearWatch(id)
      window.clearTimeout(timer)
    }
  }, [geo, watching])

  // The first fix is on its way (the permission prompt may be open). Pages hold their placeholders
  // rather than show every area and then jump to the nearest one, for up to SETTLE_MS.
  const firstFixPending = watching && fix.status === 'locating' && !fix.position
  useEffect(() => {
    if (!firstFixPending) return
    const timer = window.setTimeout(() => setSettleOver(true), SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [firstFixPending])
  const settling = firstFixPending && !settleOver

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
    const [onFix, onFail] = handlers(setFix)
    geo.getCurrentPosition((p) => onFix(fromGeolocation(p)), onFail, FRESH)
  }

  // The last address stays up while the phone is within 2 km of it (no flicker between lookups),
  // and the cached one shows while the first fix comes in. Far away or denied, there is none.
  const current =
    address && (position ? distanceKm(position, address) < STALE_KM : fix.status === 'locating') ? address : null

  return (
    <LocationContext.Provider value={{ ...fix, settling, address: current, refresh }}>
      {children}
    </LocationContext.Provider>
  )
}
