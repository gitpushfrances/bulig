import { LocateFixed, Phone, Route as RouteIcon, TriangleAlert, X } from 'lucide-react'
import type { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router'
import { PlaceRow } from '../components/Cards.tsx'
import { CATEGORY_ICONS } from '../components/icons.ts'
import RopiSays from '../components/RopiSays.tsx'
import SaveButton from '../components/SaveButton.tsx'
import { useAppData } from '../data/context.ts'
import { telHref } from '../data/format.ts'
import { placeHref } from '../data/links.ts'
import { categoryLabel } from '../data/labels.ts'
import { useNearby } from '../data/useNearby.ts'
import { usePhoneLocation } from '../location/context.ts'
import { applyMapTheme, MAP_STYLE_URL } from '../map/mapTheme.ts'
import { fetchRoute, REROUTE_DEG, type Route, type TravelMode } from '../map/route.ts'
import RouteSheet, { type RouteState } from '../map/RouteSheet.tsx'
import { formatDistance } from '../rules/nearby.ts'
import { isNew } from '../rules/services.ts'
import { useTheme } from '../theme.ts'
import { CATEGORIES, type Category } from '../types.ts'
import page from './Page.module.css'
import styles from './MapPage.module.css'

// The whole Philippines, for when there is no GPS fix and no area picked.
const PH_BOUNDS: [[number, number], [number, number]] = [
  [116.9, 4.6],
  [126.6, 21.1],
]

type Status = 'loading' | 'ready' | 'failed'

// The route line: blue, like the you-are-here dot (it is your path), on a casing that separates it
// from the roads in light and dark. Raw colours because MapLibre paints them.
const ROUTE_COLOUR = '#2563eb'
const ROUTE_CASING = { light: '#ffffff', dark: '#09090b' }

// The route in progress, kept for this browser session so leaving the Map doesn't lose it.
const ROUTE_KEY = 'bulig.route'
interface SavedRoute {
  to: string
  mode: TravelMode
}

function readRoute(): SavedRoute | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(ROUTE_KEY) ?? 'null') as SavedRoute | null
    return value && typeof value.to === 'string' ? { to: value.to, mode: value.mode === 'foot' ? 'foot' : 'car' } : null
  } catch {
    return null
  }
}

function saveRoute(value: SavedRoute | null) {
  try {
    if (value) sessionStorage.setItem(ROUTE_KEY, JSON.stringify(value))
    else sessionStorage.removeItem(ROUTE_KEY)
  } catch {
    // Private mode or blocked storage: the route just won't survive leaving the Map.
  }
}

// How long "Route ended · Undo" stays.
const UNDO_MS = 5000

// Draws (or clears) the route on the map, adding its source and layers the first time.
function drawRoute(m: MapLibreMap, path: [number, number][] | null, theme: 'light' | 'dark') {
  const data = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: path ?? [] } }
  const source = m.getSource('route') as GeoJSONSource | undefined
  if (source) source.setData(data)
  else {
    m.addSource('route', { type: 'geojson', data })
    const layout = { 'line-join': 'round' as const, 'line-cap': 'round' as const }
    m.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout, paint: { 'line-color': ROUTE_CASING[theme], 'line-width': 10 } })
    m.addLayer({ id: 'route-line', type: 'line', source: 'route', layout, paint: { 'line-color': ROUTE_COLOUR, 'line-width': 6 } })
  }
  m.setPaintProperty('route-casing', 'line-color', ROUTE_CASING[theme])
}

// Places on a free OpenFreeMap map, styled in Graphite. MapLibre loads only when this tab opens,
// so Home and Emergency never wait for it. No signal or no WebGL: the nearest places as a list.
export default function MapPage() {
  const { online, data } = useAppData()
  const { ranked, labels, area, position } = useNearby()
  const { refresh } = usePhoneLocation()
  const { resolved } = useTheme()

  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const lib = useRef<typeof import('maplibre-gl') | null>(null)
  const markers = useRef(new Map<string, Marker>())
  const userMarker = useRef<Marker | null>(null)
  const themeRef = useRef(resolved)
  const routeToRef = useRef<string | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [pins, setPins] = useState<{ id: string; el: HTMLElement }[]>([])
  const [params] = useSearchParams()
  // /map?cat=<category> (the Map button on Nearby results): open with that kind of place only.
  const [filter, setFilter] = useState<Category | null>(() => {
    const cat = params.get('cat')
    return (CATEGORIES as readonly string[]).includes(cat ?? '') ? (cat as Category) : null
  })
  // /map?to=<id> (Directions on a card): open with that place picked and its route on.
  // A ?to= link wins; otherwise pick up the route this session already had.
  const [restored] = useState(() => (params.get('to') ? { to: params.get('to')!, mode: 'car' as TravelMode } : readRoute()))
  const [selected, setSelected] = useState<string | null>(() => restored?.to ?? null)
  const [routeTo, setRouteTo] = useState<string | null>(() => restored?.to ?? null)
  const [mode, setMode] = useState<TravelMode>(() => restored?.mode ?? 'car')
  const [minimized, setMinimized] = useState(false)
  const [ended, setEnded] = useState<SavedRoute | null>(null)
  const [fetched, setFetched] = useState<{ key: string; trip: string; result: Route | null } | null>(null)
  const fittedFor = useRef<string | null>(null)

  const onMap = ranked.filter((r) => r.item.lat !== undefined && r.item.lng !== undefined)
  const shown = filter ? onMap.filter((r) => r.item.category === filter) : onMap
  const picked = onMap.find((r) => r.item.id === selected) ?? null
  const target = onMap.find((r) => r.item.id === routeTo) ?? null
  const centre =
    data.status === 'ready' && area ? data.areas.find((a) => a.id === area) : undefined

  // Load MapLibre and make the map, once.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [ml] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
        if (cancelled || !box.current) return
        lib.current = ml
        const m = new ml.Map({
          container: box.current,
          style: MAP_STYLE_URL,
          bounds: PH_BOUNDS,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
        })
        m.touchZoomRotate.disableRotation()
        m.on('style.load', () => applyMapTheme(m, themeRef.current))
        m.once('load', () => !cancelled && setStatus('ready'))
        // Tapping the map closes a place's sheet; a route in progress stays.
        m.on('click', () => setSelected(routeToRef.current))
        map.current = m
      } catch {
        if (!cancelled) setStatus('failed')
      }
    })()
    const pinned = markers.current
    return () => {
      cancelled = true
      pinned.forEach((mk) => mk.remove())
      pinned.clear()
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Follow the app theme.
  useEffect(() => {
    themeRef.current = resolved
    if (status === 'ready' && map.current) applyMapTheme(map.current, resolved)
  }, [resolved, status])

  // Fit the view to the person, else the picked area, else the country.
  const hasFix = !!position
  useEffect(() => {
    const m = map.current
    if (status !== 'ready' || !m) return
    if (position) m.jumpTo({ center: [position.lng, position.lat], zoom: 14 })
    else if (centre?.lat !== undefined && centre.lng !== undefined) m.jumpTo({ center: [centre.lng, centre.lat], zoom: 13 })
    // Only on first load and when GPS first finds the person, not on every small move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, hasFix, centre?.id])

  // The blue dot for the person.
  useEffect(() => {
    const m = map.current
    const ml = lib.current
    if (status !== 'ready' || !m || !ml) return
    if (!position) {
      userMarker.current?.remove()
      userMarker.current = null
      return
    }
    if (!userMarker.current) {
      const el = document.createElement('div')
      el.className = styles.me
      el.setAttribute('aria-hidden', 'true')
      userMarker.current = new ml.Marker({ element: el }).setLngLat([position.lng, position.lat]).addTo(m)
    } else userMarker.current.setLngLat([position.lng, position.lat])
  }, [status, position])

  // One pin per place on the map, drawn by React into MapLibre's marker elements.
  const shownIds = shown.map((r) => r.item.id).join(',')
  useEffect(() => {
    const m = map.current
    const ml = lib.current
    if (status !== 'ready' || !m || !ml) return
    const keep = new Set(shown.map((r) => r.item.id))
    markers.current.forEach((mk, id) => {
      if (!keep.has(id)) {
        mk.remove()
        markers.current.delete(id)
      }
    })
    for (const { item } of shown) {
      if (markers.current.has(item.id)) continue
      const el = document.createElement('div')
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setSelected(item.id)
      })
      markers.current.set(item.id, new ml.Marker({ element: el, anchor: 'bottom' }).setLngLat([item.lng!, item.lat!]).addTo(m))
    }
    setPins([...markers.current].map(([id, mk]) => ({ id, el: mk.getElement() })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, shownIds])

  useEffect(() => {
    routeToRef.current = routeTo
  }, [routeTo])

  useEffect(() => {
    saveRoute(routeTo ? { to: routeTo, mode } : null)
  }, [routeTo, mode])

  // "Route ended · Undo" goes away by itself.
  useEffect(() => {
    if (!ended) return
    const timer = window.setTimeout(() => setEnded(null), UNDO_MS)
    return () => window.clearTimeout(timer)
  }, [ended])

  const startRoute = (id: string) => {
    setRouteTo(id)
    setSelected(id)
    setMinimized(false)
    setEnded(null)
  }
  const endRoute = () => {
    if (routeTo) setEnded({ to: routeTo, mode })
    setRouteTo(null)
    setSelected(null)
    setMinimized(false)
  }
  const undoEnd = () => {
    if (!ended) return
    setMode(ended.mode)
    startRoute(ended.to)
  }


  // One trip = one place and one way of travelling. Within a trip, the route is asked for again when
  // the phone enters a new ~200 m cell, so it follows a driver without asking on every GPS tick.
  const trip = target ? `${target.item.id}:${mode}` : ''
  const cell = position ? `${Math.round(position.lat / REROUTE_DEG)}:${Math.round(position.lng / REROUTE_DEG)}` : ''
  const requestKey = target && position ? `${trip}@${cell}` : ''

  useEffect(() => {
    if (!requestKey || !target || !position) return
    const controller = new AbortController()
    fetchRoute(position, { lat: target.item.lat!, lng: target.item.lng! }, mode, controller.signal)
      .then((result) => setFetched({ key: requestKey, trip, result }))
      .catch(() => {
        if (!controller.signal.aborted) setFetched({ key: requestKey, trip, result: null })
      })
    return () => controller.abort()
    // The key holds everything that should trigger a new request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  // What the route bar shows, worked out from the trip, the fix and the last answer.
  let route: RouteState = { kind: 'off' }
  if (target && !position) route = { kind: 'no-location' }
  else if (target && fetched?.trip === trip) {
    // The answer for this cell, or the previous one while a reroute is on its way.
    if (fetched.result) route = { kind: 'ready', route: fetched.result }
    else route = fetched.key === requestKey ? { kind: 'failed' } : { kind: 'loading' }
  } else if (target) route = { kind: 'loading' }

  // Draw the line (or clear it) whenever the route or the theme changes.
  const path = route.kind === 'ready' ? route.route.path : null

  // Fit the whole route once per trip, after the map has its first view; rerouting while driving
  // keeps whatever view the person has.
  useEffect(() => {
    const m = map.current
    const ml = lib.current
    if (status !== 'ready' || !m || !ml || !path?.length || fittedFor.current === trip) return
    fittedFor.current = trip
    const bounds = path.reduce((b, p) => b.extend(p), new ml.LngLatBounds(path[0], path[0]))
    // Leave room for the route sheet: along the bottom on phones, on the left from tablets up.
    const wide = matchMedia('(min-width: 48rem)').matches
    const padding = wide ? { top: 120, bottom: 60, left: 480, right: 100 } : { top: 110, bottom: 340, left: 40, right: 80 }
    m.fitBounds(bounds, { padding, duration: 600, maxZoom: 16 })
  }, [status, path, trip])
  useEffect(() => {
    const m = map.current
    if (status !== 'ready' || !m) return
    drawRoute(m, path, resolved)
  }, [status, path, resolved])

  const recentre = () => {
    refresh()
    if (position) map.current?.flyTo({ center: [position.lng, position.lat], zoom: 15, duration: 600 })
  }

  if (status === 'failed' || (!online && status !== 'ready')) {
    return (
      <section className={`${page.page} ${styles.fallback}`} aria-labelledby="map-title">
        <h1 id="map-title" className="visually-hidden">
          Map of places near you
        </h1>
        <RopiSays variant="thinking" height={110}>
          The map needs a connection. <strong>Here are the nearest places instead.</strong>
        </RopiSays>
        <div className={page.panel}>
          <ul className={page.rows} aria-label="Nearest places">
            {ranked.slice(0, 8).map(({ item, km }) => (
              <PlaceRow key={item.id} service={item} labels={labels} km={km} />
            ))}
          </ul>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.wrap} aria-labelledby="map-title">
      <h1 id="map-title" className="visually-hidden">
        Map of places near you
      </h1>
      <div ref={box} className={styles.map} />
      {status === 'loading' && <div className={styles.loading} aria-hidden="true" />}

      <div className={styles.chips} role="group" aria-label="Show on map">
        <button type="button" aria-pressed={filter === null} onClick={() => setFilter(null)}>
          All
        </button>
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c]
          return (
            <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(filter === c ? null : c)}>
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
              {categoryLabel(c, labels)}
            </button>
          )
        })}
      </div>

      <div className={styles.controls}>
        <Link to="/emergency" className={styles.sos} aria-label="Emergency numbers">
          <TriangleAlert size={22} strokeWidth={2.25} aria-hidden="true" />
        </Link>
        <button type="button" className={styles.control} onClick={recentre} aria-label="Go to my location">
          <LocateFixed size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {pins.map(({ id, el }) => {
        const r = shown.find((s) => s.item.id === id)
        if (!r) return null
        const Icon = CATEGORY_ICONS[r.item.category]
        return createPortal(
          <button
            type="button"
            className={`${styles.pin} ${selected === id ? styles.pinOn : ''}`}
            aria-label={`${r.item.name}, ${r.item.subtype ?? categoryLabel(r.item.category, labels)}`}
          >
            <Icon size={18} strokeWidth={2} aria-hidden="true" />
          </button>,
          el,
          id,
        )
      })}

      {/* A place's sheet (tapped pin) sits over the route; closing it brings the route back. */}
      {picked && picked.item.id !== routeTo ? (
        <div className={styles.sheet} role="dialog" aria-label={picked.item.name}>
          <div className={styles.sheetHead}>
            <div className={styles.sheetTitle}>
              <h2 className={page.cardTitle}>{picked.item.name}</h2>
              <p className={page.meta}>
                {picked.item.subtype ?? categoryLabel(picked.item.category, labels)}
                {picked.km !== null && ` · ${formatDistance(picked.km)} away`}
              </p>
              <p className={page.meta}>{picked.item.landmark}</p>
            </div>
            {isNew(picked.item, new Date()) && <span className={page.newBadge}>NEW</span>}
            {picked.item.sample && <span className={page.sample}>SAMPLE</span>}
            <SaveButton id={picked.item.id} name={picked.item.name} />
            <button type="button" className={styles.close} onClick={() => setSelected(routeTo)} aria-label="Close">
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <div className={page.actions}>
            {picked.item.phone && (
              <a className={page.call} href={telHref(picked.item.phone)} aria-label={`Call ${picked.item.name}`}>
                <Phone size={18} strokeWidth={2} aria-hidden="true" />
                Call
              </a>
            )}
            <button
              type="button"
              className={page.secondary}
              onClick={() => startRoute(picked.item.id)}
              aria-label={`Route to ${picked.item.name}`}
            >
              <RouteIcon size={18} strokeWidth={2} aria-hidden="true" />
              {target ? 'Route here instead' : 'Route'}
            </button>
            <Link className={page.secondary} to={placeHref(picked.item)} aria-label={`Details for ${picked.item.name}`}>
              Details
            </Link>
          </div>
        </div>
      ) : target ? (
        <RouteSheet
          place={target.item}
          route={route}
          mode={mode}
          onMode={setMode}
          minimized={minimized}
          onMinimize={() => setMinimized(true)}
          onExpand={() => setMinimized(false)}
          onEnd={endRoute}
        />
      ) : (
        ended && (
          <div className={styles.toast} role="status">
            <span>Route ended</span>
            <button type="button" onClick={undoEnd}>
              Undo
            </button>
          </div>
        )
      )}
    </section>
  )
}
