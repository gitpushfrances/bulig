import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Link } from 'react-router'
import { useAppData } from '../data/context.ts'
import { hasWebGL, LOAD_TIMEOUT_MS } from '../map/loadMap.ts'
import { applyMapTheme, MAP_CREDIT, mapRenderOptions, themedStyle } from '../map/mapTheme.ts'
import type { Position, Ranked } from '../rules/nearby.ts'
import { useTheme } from '../theme.ts'
import type { Service } from '../types.ts'
import { CATEGORY_ICONS } from './icons.ts'
import styles from './MiniMap.module.css'

// How many of the nearest places get a pin on Home's map.
export const MINI_PINS = 5

// Home's "Nearest to you" map: the real map with you and the nearest few places, as a picture that
// opens the Map tab. It never slows down 911: MapLibre loads only once Home has drawn, the card is on
// screen and the phone is idle; until then (and whenever it can't load: offline, no WebGL, too slow)
// the card shows a flat placeholder and the list under it does the job.
export default function MiniMap({ centre, places }: { centre: Position; places: Ranked<Service>[] }) {
  const { online } = useAppData()
  const { resolved } = useTheme()
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const meMarker = useRef<Marker | null>(null)
  // You stay in the middle: the latest position, read when framing (after a resize or a GPS move).
  const centreRef = useRef(centre)
  const placesRef = useRef(places)
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<'idle' | 'ready' | 'failed'>('idle')

  // Start only when the card scrolls into view.
  useEffect(() => {
    const el = box.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const seen = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          seen.disconnect()
        }
      },
      { rootMargin: '120px' },
    )
    seen.observe(el)
    return () => seen.disconnect()
  }, [])

  // You in the middle, zoomed so the pinned places fit around you: the bounds are mirrored through
  // your position, so centring on you never pushes a pin off the card.
  const frame = (m: MapLibreMap) => {
    const c = centreRef.current
    const pts = placesRef.current.map((p) => ({ lat: p.item.lat!, lng: p.item.lng! }))
    let zoom = 15
    if (pts.length) {
      const dLat = Math.max(...pts.map((p) => Math.abs(p.lat - c.lat)), 0.002)
      const dLng = Math.max(...pts.map((p) => Math.abs(p.lng - c.lng)), 0.002)
      const camera = m.cameraForBounds(
        [
          [c.lng - dLng, c.lat - dLat],
          [c.lng + dLng, c.lat + dLat],
        ],
        { padding: { top: 44, bottom: 20, left: 24, right: 24 }, maxZoom: 16 },
      )
      zoom = Math.max(12, camera?.zoom ?? 15)
    }
    m.jumpTo({ center: [c.lng, c.lat], zoom })
  }

  // Follow the phone: move the dot and keep it centred as GPS updates.
  useEffect(() => {
    centreRef.current = centre
    placesRef.current = places
  })
  const { lat, lng } = centre
  useEffect(() => {
    if (state !== 'ready' || !map.current) return
    meMarker.current?.setLngLat([lng, lat])
    map.current.easeTo({ center: [lng, lat], duration: 800 })
  }, [lat, lng, state])

  const canDraw = visible && online
  useEffect(() => {
    if (!canDraw) return
    let cancelled = false
    let timer = 0
    const icons: Root[] = []
    let resize: ResizeObserver | null = null
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 300))
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout
    const handle = idle(async () => {
      if (cancelled || !box.current) return
      if (!hasWebGL()) return setState('failed')
      try {
        timer = window.setTimeout(() => !cancelled && setState('failed'), LOAD_TIMEOUT_MS)
        const [[ml], style] = await Promise.all([
          Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]),
          themedStyle(resolved),
        ])
        if (cancelled || !box.current) return
        const c = centreRef.current
        const m = new ml.Map({
          ...mapRenderOptions(),
          container: box.current,
          style,
          center: [c.lng, c.lat],
          zoom: 14,
          // A picture, not a widget: no drag, no zoom, so it never moves and never traps the scroll.
          interactive: false,
        })
        m.once('load', () => {
          window.clearTimeout(timer)
          if (cancelled) return
          setState('ready')
          frame(m)
        })
        for (const p of places) {
          const el = document.createElement('span')
          el.className = styles.pin
          el.dataset.category = p.item.category
          const Icon = CATEGORY_ICONS[p.item.category]
          const icon = createRoot(el)
          icon.render(<Icon size={14} weight="bold" aria-hidden="true" />)
          icons.push(icon)
          new ml.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.item.lng!, p.item.lat!]).addTo(m)
        }
        const me = document.createElement('span')
        me.className = styles.me
        meMarker.current = new ml.Marker({ element: me }).setLngLat([c.lng, c.lat]).addTo(m)
        map.current = m
        // The card can change width after the map is made (fonts, the data notice, rotating the
        // phone): redraw at the new size and put you back in the middle.
        if (typeof ResizeObserver !== 'undefined' && box.current) {
          resize = new ResizeObserver(() => {
            m.resize()
            frame(m)
          })
          resize.observe(box.current)
        }
      } catch {
        if (!cancelled) setState('failed')
      }
    })
    return () => {
      cancelled = true
      cancelIdle(handle as number)
      window.clearTimeout(timer)
      resize?.disconnect()
      map.current?.remove()
      map.current = null
      meMarker.current = null
      // Unmount after this render pass: React warns about unmounting a root while rendering.
      queueMicrotask(() => icons.forEach((r) => r.unmount()))
    }
    // Made once per visit to Home; the pins are the nearest places when it was made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDraw])

  useEffect(() => {
    if (state === 'ready' && map.current) applyMapTheme(map.current, resolved)
  }, [resolved, state])

  if (state === 'failed') return null
  return (
    <Link to="/map" className={styles.card} aria-label="Open the map">
      <div ref={box} className={`${styles.map} ${state === 'ready' ? styles.shown : ''}`} aria-hidden="true" />
      {/* The licence credit as quiet text; the full credit and links are on the Map tab and Licences. */}
      <span className={styles.credit}>{MAP_CREDIT.text}</span>
    </Link>
  )
}
