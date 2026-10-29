import { LocateFixed, Navigation, Phone, TriangleAlert, X } from 'lucide-react'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { PlaceRow } from '../components/Cards.tsx'
import { CATEGORY_ICONS } from '../components/icons.ts'
import RopiSays from '../components/RopiSays.tsx'
import SaveButton from '../components/SaveButton.tsx'
import { useAppData } from '../data/context.ts'
import { directionsHref, telHref } from '../data/format.ts'
import { categoryLabel } from '../data/labels.ts'
import { useNearby } from '../data/useNearby.ts'
import { usePhoneLocation } from '../location/context.ts'
import { applyMapTheme, MAP_STYLE_URL } from '../map/mapTheme.ts'
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
  const [status, setStatus] = useState<Status>('loading')
  const [pins, setPins] = useState<{ id: string; el: HTMLElement }[]>([])
  const [filter, setFilter] = useState<Category | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const onMap = ranked.filter((r) => r.item.lat !== undefined && r.item.lng !== undefined)
  const shown = filter ? onMap.filter((r) => r.item.category === filter) : onMap
  const picked = shown.find((r) => r.item.id === selected) ?? null
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
        m.on('click', () => setSelected(null))
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

      {picked && (
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
            <button type="button" className={styles.close} onClick={() => setSelected(null)} aria-label="Close">
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
            <a
              className={page.secondary}
              href={directionsHref(picked.item.lat!, picked.item.lng!)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Directions to ${picked.item.name}`}
            >
              <Navigation size={18} strokeWidth={2} aria-hidden="true" />
              Directions
            </a>
          </div>
        </div>
      )}
    </section>
  )
}
