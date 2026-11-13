import { ArrowClockwise, Crosshair, GpsSlash, MapTrifold, Path as RouteIcon, Phone, Target, Warning, X } from '@phosphor-icons/react'
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
import { hasWebGL, LOAD_TIMEOUT_MS, PROBLEM_TEXT, type MapProblem } from '../map/loadMap.ts'
import { attachMap, detachMap, dropMap, keepMap, keptMap, readView, saveView, type KeptMap } from '../map/mapKeeper.ts'
import { applyMapTheme, MAP_CREDIT, mapRenderOptions, themedStyle } from '../map/mapTheme.ts'
import { boundsOf, circle, NEARBY_KM, placesInScope, type MapScope } from '../map/mapScope.ts'
import { readRoute, readScope, saveRoute, saveScope, type SavedRoute } from '../map/mapSession.ts'
import { fetchRoute, REROUTE_DEG, type Route, type TravelMode } from '../map/route.ts'
import RouteSheet, { type RouteState } from '../map/RouteSheet.tsx'
import { formatDistance } from '../rules/nearby.ts'
import { isNew } from '../rules/services.ts'
import { useTheme } from '../theme.ts'
import { CATEGORIES, type Category } from '../types.ts'
import { prefetchTiles } from '../map/tilePrefetch.ts'
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
  const { refresh, status: gps, settling } = usePhoneLocation()
  const { resolved } = useTheme()

  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const lib = useRef<typeof import('maplibre-gl') | null>(null)
  const markers = useRef(new Map<string, Marker>())
  const userMarker = useRef<Marker | null>(null)
  const themeRef = useRef(resolved)
  const routeToRef = useRef<string | null>(null)
  // A map kept from an earlier visit this session opens ready, at the view it was left at.
  const [status, setStatus] = useState<Status>(() => (keptMap()?.loaded ? 'ready' : 'loading'))
  const [problem, setProblem] = useState<MapProblem>('failed')
  // Try again bumps this, which makes the map from scratch.
  const [attempt, setAttempt] = useState(0)
  const [following, setFollowing] = useState(() => keptMap()?.following ?? true)
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

  const [scope, setScope] = useState<MapScope>(readScope)
  const centre =
    data.status === 'ready' && area ? data.areas.find((a) => a.id === area) : undefined
  // Nearby measures from the phone, else the picked town's centre (no GPS: still useful, and the
  // sheet then shows no distance, so nothing claims to be measured from you).
  const origin = position ?? (centre?.lat !== undefined && centre.lng !== undefined ? { lat: centre.lat, lng: centre.lng } : null)
  // Every listed place in the country, not only the picked area's: All has no radius and no area.
  const services = data.status === 'ready' ? data.services : []
  const everywhere = placesInScope(services, { scope: 'all', category: null, position, origin })
  const shown = placesInScope(services, { scope, category: filter, position, origin })
  const picked = everywhere.find((r) => r.item.id === selected) ?? null
  const target = everywhere.find((r) => r.item.id === routeTo) ?? null

  // Where to open a brand-new map, read when it is made (refs, so making it doesn't wait on GPS).
  const positionRef = useRef(position)
  const centreRef = useRef(centre)
  useEffect(() => {
    positionRef.current = position
    centreRef.current = centre
  })

  // Get the map onto the page: the one kept from an earlier visit (mapKeeper.ts), else a new one.
  useEffect(() => {
    let cancelled = false
    let timer = 0
    let unwire = () => {}
    const fail = (why: MapProblem) => {
      if (cancelled) return
      dropMap()
      map.current = null
      setProblem(why)
      setStatus('failed')
    }
    // Listeners that update this page; removed when the page goes, so a kept map never calls into
    // a page that is gone.
    const wire = (k: KeptMap) => {
      const m = k.map
      // Tapping the map closes a place's sheet; a route in progress stays.
      const onClick = () => setSelected(routeToRef.current)
      // Moving the map yourself stops it following you; Go to my location turns following back on.
      const onDrag = () => setFollowing(false)
      const onMoveEnd = () => {
        const c = m.getCenter()
        saveView({ lng: c.lng, lat: c.lat, zoom: m.getZoom() })
      }
      m.on('click', onClick)
      m.on('dragstart', onDrag)
      m.on('moveend', onMoveEnd)
      // Fetch the streets just off screen while the map is still, so panning isn't blank.
      const stopPrefetch = prefetchTiles(m)
      return () => {
        stopPrefetch()
        m.off('click', onClick)
        m.off('dragstart', onDrag)
        m.off('moveend', onMoveEnd)
      }
    }
    // Ready once the first full draw is done, or failed after LOAD_TIMEOUT_MS on a weak signal.
    const whenLoaded = (k: KeptMap) => {
      if (k.loaded) return
      timer = window.setTimeout(() => fail(navigator.onLine ? 'failed' : 'offline'), LOAD_TIMEOUT_MS)
      k.map.once('load', () => {
        k.loaded = true
        window.clearTimeout(timer)
        if (!cancelled) setStatus('ready')
      })
    }

    const reuse = keptMap()
    if (reuse && box.current) {
      attachMap(reuse, box.current)
      lib.current = reuse.lib
      map.current = reuse.map
      unwire = wire(reuse)
      whenLoaded(reuse)
    } else {
      ;(async () => {
        if (!hasWebGL()) return fail('no-webgl')
        timer = window.setTimeout(() => fail(navigator.onLine ? 'failed' : 'offline'), LOAD_TIMEOUT_MS)
        try {
          const [[ml], style] = await Promise.all([
            Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]),
            // Fetched and recoloured before the map exists, so it never flashes the stock colours.
            themedStyle(themeRef.current),
          ])
          if (cancelled || !box.current) return
          window.clearTimeout(timer)
          // Open on the person, else where they last looked, else their area, else the country.
          const here = positionRef.current
          const last = readView()
          const area = centreRef.current
          const view =
            here ? { center: [here.lng, here.lat] as [number, number], zoom: 14 }
            : last ? { center: [last.lng, last.lat] as [number, number], zoom: last.zoom }
            : area?.lat !== undefined && area.lng !== undefined ? { center: [area.lng, area.lat] as [number, number], zoom: 13 }
            : { bounds: PH_BOUNDS }
          const element = document.createElement('div')
          element.className = styles.canvasBox
          box.current.appendChild(element)
          const m = new ml.Map({
            ...mapRenderOptions(),
            ...view,
            container: element,
            style,
            dragRotate: false,
            pitchWithRotate: false,
          })
          m.touchZoomRotate.disableRotation()
          const k: KeptMap = {
            map: m,
            lib: ml,
            element,
            loaded: false,
            fitted: here ? 'person' : 'bounds' in view ? 'none' : 'area',
            following: true,
            theme: themeRef.current,
          }
          keepMap(k)
          lib.current = ml
          map.current = m
          unwire = wire(k)
          whenLoaded(k)
        } catch {
          fail(navigator.onLine ? 'failed' : 'offline')
        }
      })()
    }

    const pinned = markers.current
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      unwire()
      // Pins and the blue dot belong to this page (React draws into them); the map keeps the rest.
      pinned.forEach((mk) => mk.remove())
      pinned.clear()
      userMarker.current?.remove()
      userMarker.current = null
      const k = keptMap()
      if (k) detachMap(k)
      map.current = null
      fittedFor.current = null
      setPins([])
    }
  }, [attempt])

  useEffect(() => {
    const k = keptMap()
    if (k) k.following = following
  }, [following])

  // Follow the app theme.
  useEffect(() => {
    themeRef.current = resolved
    const k = keptMap()
    if (status !== 'ready' || !map.current || !k || k.theme === resolved) return
    applyMapTheme(map.current, resolved)
    k.theme = resolved
  }, [resolved, status])

  // Fit the view to the person, else the picked area, once per session: a map kept from an earlier
  // visit stays where the person left it. When GPS first finds them, the view moves to them once.
  const hasFix = !!position
  useEffect(() => {
    const m = map.current
    const k = keptMap()
    if (status !== 'ready' || !m || !k || k.fitted === 'person') return
    if (position) {
      m.jumpTo({ center: [position.lng, position.lat], zoom: Math.max(m.getZoom(), 14) })
      k.fitted = 'person'
    } else if (k.fitted === 'none' && centre?.lat !== undefined && centre.lng !== undefined) {
      m.jumpTo({ center: [centre.lng, centre.lat], zoom: 13 })
      k.fitted = 'area'
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, hasFix, centre?.id])

  // Follow you live (a new fix every 3 s at most, LocationProvider), like a navigation app, until
  // you drag the map. Not during a route: the route view stays fitted to the whole trip.
  const followLat = position?.lat
  const followLng = position?.lng
  useEffect(() => {
    const m = map.current
    if (status !== 'ready' || !m || !following || routeTo || followLat === undefined || followLng === undefined) return
    m.easeTo({ center: [followLng, followLat], duration: 800 })
  }, [status, following, routeTo, followLat, followLng])

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

  // Nearby zooms to the 5 km around you and goes back to following you. All keeps the view where it
  // is and just shows the places Nearby hid (John, 2026-11-07); pan or zoom out to see more.
  const pickScope = (next: MapScope) => {
    setScope(next)
    saveScope(next)
    const m = map.current
    if (!m || status !== 'ready') return
    const wide = matchMedia('(min-width: 48rem)').matches
    const padding = wide ? { top: 120, bottom: 60, left: 60, right: 100 } : { top: 110, bottom: 60, left: 30, right: 80 }
    if (next === 'nearby') {
      const box = origin ? boundsOf(circle(origin)) : null
      if (!box) return setFollowing(true)
      // Follow again only once the fit is done: following eases to the next fix, which would cut
      // the zoom-in short and leave the country view (seen in the browser check, 2026-11-05).
      setFollowing(false)
      m.once('moveend', () => setFollowing(true))
      m.fitBounds(box, { padding, duration: 600 })
      return
    }
    // All: stay put. Stop following, or the next GPS fix pulls the view back to you.
    setFollowing(false)
  }

  const recentre = () => {
    setFollowing(true)
    refresh()
    if (position) map.current?.flyTo({ center: [position.lng, position.lat], zoom: 15, duration: 600 })
  }

  if (status === 'failed' || (!online && status !== 'ready')) {
    const why = status === 'failed' ? problem : 'offline'
    const text = PROBLEM_TEXT[why]
    const retry = () => {
      dropMap()
      setStatus('loading')
      setAttempt((n) => n + 1)
    }
    return (
      <section className={`${page.page} ${styles.fallback}`} aria-labelledby="map-title">
        <h1 id="map-title" className="visually-hidden">
          Map of places near you
        </h1>
        <RopiSays variant="thinking" height={110}>
          {text.lead} <strong>Here are the nearest places instead.</strong>
          {text.hint && <> {text.hint}</>}
        </RopiSays>
        {why !== 'no-webgl' && online && (
          <button type="button" className={page.secondary} onClick={retry}>
            <ArrowClockwise size={18} aria-hidden="true" />
            Try the map again
          </button>
        )}
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
      {/* The licence credit as one quiet line, instead of MapLibre's "i" button and pop-up. */}
      <a className={styles.credit} href={MAP_CREDIT.href} target="_blank" rel="noreferrer">
        {MAP_CREDIT.text}
      </a>
      {status === 'loading' && <div className={styles.loading} aria-hidden="true" />}

      {/* Without GPS the map still works, centred on the area; this says why there's no blue dot. */}
      {!settling && (gps === 'denied' || gps === 'error' || gps === 'unavailable') && (
        <div className={styles.locationOff} role="status">
          <GpsSlash size={18} aria-hidden="true" />
          <span>
            {gps === 'denied'
              ? 'Location is blocked. Allow it for this site in your browser settings.'
              : gps === 'unavailable'
                ? 'This browser has no location. The map shows your area.'
                : "Couldn't find your location."}
          </span>
          {gps === 'error' && (
            <button type="button" onClick={refresh}>
              Try again
            </button>
          )}
        </div>
      )}

      <div className={styles.chips} role="group" aria-label="Show on map">
        <button type="button" aria-pressed={scope === 'all'} onClick={() => pickScope('all')} aria-label="All places">
          <MapTrifold size={16} aria-hidden="true" />
          All
        </button>
        <button type="button" aria-pressed={scope === 'nearby'} onClick={() => pickScope('nearby')} aria-label={`Nearby, within ${NEARBY_KM} km`}>
          <Target size={16} aria-hidden="true" />
          Nearby
        </button>
        <span className={styles.chipGap} aria-hidden="true" />
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c]
          return (
            <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(filter === c ? null : c)}>
              <Icon size={16} aria-hidden="true" />
              {categoryLabel(c, labels)}
            </button>
          )
        })}
      </div>

      <div className={styles.controls}>
        <Link to="/emergency" className={styles.sos} aria-label="Emergency numbers">
          <Warning size={22} aria-hidden="true" />
        </Link>
        <button type="button" className={styles.control} onClick={recentre} aria-label="Go to my location">
          <Crosshair size={20} aria-hidden="true" />
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
            data-category={r.item.category}
            aria-label={`${r.item.name}, ${r.item.subtype ?? categoryLabel(r.item.category, labels)}`}
          >
            <Icon size={18} aria-hidden="true" />
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
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className={page.actions}>
            {picked.item.phone && (
              <a className={page.call} href={telHref(picked.item.phone)} aria-label={`Call ${picked.item.name}`}>
                <Phone size={18} aria-hidden="true" />
                Call
              </a>
            )}
            <button
              type="button"
              className={page.secondary}
              onClick={() => startRoute(picked.item.id)}
              aria-label={`Route to ${picked.item.name}`}
            >
              <RouteIcon size={18} aria-hidden="true" />
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
      ) : ended ? (
        <div className={styles.toast} role="status">
          <span>Route ended</span>
          <button type="button" onClick={undoEnd}>
            Undo
          </button>
        </div>
      ) : (
        // Nearby came up empty: say why, and offer every place instead of a blank map.
        status === 'ready' &&
        data.status === 'ready' &&
        scope === 'nearby' &&
        shown.length === 0 &&
        !settling && (
          <div className={styles.toast} role="status">
            <span>{origin ? `Nothing listed within ${NEARBY_KM} km${filter ? ' for that' : ''}.` : 'Nearby needs your location.'}</span>
            <button type="button" onClick={() => pickScope('all')}>
              Show all
            </button>
          </div>
        )
      )}
    </section>
  )
}
