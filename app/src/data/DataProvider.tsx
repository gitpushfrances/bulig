import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { AreaId, CountryCode, Service } from '../types.ts'
import { boxOfCell, cellsAround, cellsInBox, type Box } from './cells.ts'
import { AppDataContext, type DataState } from './context.ts'
import { pickCountry } from './countries.ts'
import type { DataSource, PlaceQuery } from './DataSource.ts'
import { appSource } from './ApiSource.ts'
import { usePhoneLocation } from '../location/context.ts'
import { nearestArea } from '../rules/nearby.ts'
import { readSaved, writeSaved } from './storage.ts'

const AREA_KEY = 'bulig.area'
// The free server sleeps and takes about a minute to wake. When a read fell back to the bundled
// files, try the API again after these waits, keeping the current data on screen meanwhile.
const WAKE_RETRY_MS = [20_000, 45_000, 90_000]
const COUNTRY_KEY = 'bulig.country'

function subscribeOnline(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

// Most IDs in one request (API.md §3.3).
const IDS_PER_REQUEST = 100

// A request for places: a map square ("c:44,502"), an area ("a:<id>") or one place ("i:<id>").
type PlaceKey = string

function queryFor(key: PlaceKey): PlaceQuery {
  if (key.startsWith('c:')) return { bbox: boxOfCell(key.slice(2)) }
  if (key.startsWith('a:')) return { area: key.slice(2) }
  return { ids: [key.slice(2)] }
}

// Loads the picked country's areas, numbers and labels once, and places only where they are needed:
// the map squares around the person (or the picked area), the squares a map view shows, and saved or
// linked places by ID. Places add up for the session; nothing reads the whole country.
export default function DataProvider({
  children,
  source = appSource,
  wakeRetryMs = WAKE_RETRY_MS,
}: {
  children: ReactNode
  source?: DataSource
  wakeRetryMs?: readonly number[]
}) {
  const [country] = useState<CountryCode>(() => pickCountry(readSaved(COUNTRY_KEY), navigator.languages ?? []))
  const [savedArea, setSavedArea] = useState<AreaId | null>(() => readSaved(AREA_KEY))
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{ key: string; data: DataState; fromBackup: boolean } | null>(null)
  const [wakeTries, setWakeTries] = useState(0)
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine)
  const { position } = usePhoneLocation()

  const key = `${country}#${attempt}`
  useEffect(() => {
    let live = true
    Promise.all([
      source.areas(country),
      source.emergencyContacts(country),
      source.labels(country).catch(() => null), // missing labels only means English defaults
    ]).then(
      ([areas, emergency, labels]) => {
        if (live)
          setLoaded({
            key,
            data: { status: 'ready', areas: areas.items, emergency: emergency.items, services: [], labels },
            fromBackup: [areas, emergency, labels].some((r) => r?.fromBackup),
          })
      },
      (err: unknown) => {
        if (live)
          setLoaded({
            key,
            data: { status: 'error', error: err instanceof Error ? err.message : String(err) },
            fromBackup: false,
          })
      },
    )
    return () => {
      live = false
    }
  }, [country, source, key])

  // ---------- Places, by map square or ID ----------
  const [places, setPlaces] = useState<ReadonlyMap<string, Service>>(() => new Map())
  // Every request made this session (asked again after the server wakes), and the IDs that came back empty.
  const asked = useRef(new Set<PlaceKey>())
  const [pending, setPending] = useState(0)
  const [placesFromBackup, setPlacesFromBackup] = useState(false)
  const [missing, setMissing] = useState<ReadonlySet<string>>(() => new Set())

  const fetchKeys = useCallback(
    (keys: PlaceKey[]) => {
      if (!keys.length) return Promise.resolve()
      const ids = keys.filter((k) => k.startsWith('i:')).map((k) => k.slice(2))
      const queries: PlaceQuery[] = keys.filter((k) => !k.startsWith('i:')).map(queryFor)
      for (let i = 0; i < ids.length; i += IDS_PER_REQUEST) queries.push({ ids: ids.slice(i, i + IDS_PER_REQUEST) })
      setPending((n) => n + queries.length)
      const calls = queries.map((query) =>
        source
          .services(country, query)
          .then(
            (env) => {
              if (env.fromBackup) setPlacesFromBackup(true)
              setPlaces((old) => {
                if (!env.items.length) return old
                const next = new Map(old)
                for (const s of env.items) next.set(s.id, s)
                return next
              })
              if ('ids' in query) {
                const found = new Set(env.items.map((s) => s.id))
                const gone = query.ids.filter((id) => !found.has(id))
                // From the bundled files, a missing ID may only be waiting for the server: not "gone" yet.
                if (gone.length && !env.fromBackup) setMissing((old) => new Set([...old, ...gone]))
              }
            },
            () => setPlacesFromBackup(true),
          )
          .finally(() => setPending((n) => n - 1)),
      )
      return Promise.allSettled(calls).then(() => undefined)
    },
    [source, country],
  )

  const ask = useCallback(
    (keys: PlaceKey[]) => {
      const fresh = keys.filter((k) => !asked.current.has(k))
      fresh.forEach((k) => asked.current.add(k))
      return fetchKeys(fresh)
    },
    [fetchKeys],
  )

  const ensurePlaces = useCallback(
    (req: { box?: Box; ids?: string[] }) => {
      const keys: PlaceKey[] = []
      if (req.box) keys.push(...cellsInBox(req.box).map((c) => `c:${c}`))
      if (req.ids) keys.push(...req.ids.map((id) => `i:${id}`))
      void ask(keys)
    },
    [ask],
  )

  // Waiting for the server to wake: try again in the background, a few times only.
  const needsWake =
    loaded?.key === key && (loaded.fromBackup || placesFromBackup) && wakeTries < wakeRetryMs.length
  useEffect(() => {
    if (!needsWake) return
    const timer = setTimeout(() => {
      setWakeTries((n) => n + 1)
      setAttempt((n) => n + 1)
      // Ask the awake server again for every place request made so far.
      setPlacesFromBackup(false)
      void fetchKeys([...asked.current])
    }, wakeRetryMs[wakeTries])
    return () => clearTimeout(timer)
  }, [needsWake, wakeTries, wakeRetryMs, fetchKeys])

  // A background retry keeps the last good data on screen instead of flashing skeletons.
  const base: DataState =
    loaded?.key === key ? loaded.data : loaded?.data.status === 'ready' ? loaded.data : { status: 'loading' }
  // GPS wins. Without a fix, a saved area that no longer exists (renamed, removed) falls back to "all areas".
  const nearest = base.status === 'ready' && position ? nearestArea(position, base.areas) : null
  const area = nearest
    ? nearest.area.id
    : base.status === 'ready' && base.areas.some((a) => a.id === savedArea)
      ? savedArea
      : null

  // The squares around the person, else around the picked area's centre; plus that whole area, which
  // also brings its places that have no pin yet (a town is small, unlike the country).
  const picked = base.status === 'ready' && area ? base.areas.find((a) => a.id === area) : undefined
  const centreOfHome = position ?? (picked?.lat !== undefined && picked.lng !== undefined ? { lat: picked.lat, lng: picked.lng } : null)
  const home: PlaceKey[] =
    base.status !== 'ready'
      ? []
      : [
          ...(centreOfHome ? cellsAround(centreOfHome.lat, centreOfHome.lng).map((c) => `c:${c}`) : []),
          ...(area ? [`a:${area}`] : []),
        ]
  const homeKey = home.join('|')
  // The places near the person have answered for this spot. Until then lists show a skeleton rather
  // than "nothing near" (useNearby). The rest of the data, numbers above all, never waits for places.
  const [doneKey, setDoneKey] = useState('')
  useEffect(() => {
    if (homeKey) void ask(homeKey.split('|')).then(() => setDoneKey(homeKey))
  }, [homeKey, ask])

  const services = useMemo(() => [...places.values()], [places])
  const data: DataState = base.status !== 'ready' ? base : { ...base, services }

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
        fromBackup: (loaded?.fromBackup ?? false) || placesFromBackup,
        ensurePlaces,
        missingPlaces: missing,
        loadingPlaces: pending > 0,
        nearLoading: homeKey !== '' && doneKey !== homeKey,
        retry: () => setAttempt((n) => n + 1),
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}
