import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Link } from 'react-router'
import { useAppData } from '../data/context.ts'
import { usePhoneLocation } from '../location/context.ts'
import { hasWebGL, LOAD_TIMEOUT_MS } from '../map/loadMap.ts'
import { applyMapTheme, MAP_CREDIT, mapRenderOptions, themedStyle } from '../map/mapTheme.ts'
import { accuracyPx, GLIDE_MS, glideAt, shouldCut } from '../map/miniMapMotion.ts'
import type { Position, Ranked } from '../rules/nearby.ts'
import { useTheme } from '../theme.ts'
import type { Service } from '../types.ts'
import { CATEGORY_ICONS } from './icons.ts'
import styles from './MiniMap.module.css'

// How many of the nearest places get a pin on Home's map.
export const MINI_PINS = 5
// Two pins closer than this on screen overlap (28px pins plus their white ring).
const PIN_GAP_PX = 30

// Home's "Nearest to you" map: the real map with you and the nearest few places, as a picture that
// opens the Map tab. It never slows down 911: MapLibre loads only once Home has drawn, the card is on
// screen and the phone is idle; until then (and whenever it can't load: offline, no WebGL, too slow)
// the card shows a pulsing placeholder and the list under it does the job.
//
// Made once per app session (2026-11-05, like the Map tab's map.ts keeper): leaving Home lifts the
// map out of the page and coming back puts it back, already drawn, so Home never redraws it from
// nothing. The dot glides to each new GPS fix and shows how sure the phone is (the accuracy ring).

interface KeptMini {
  map: MapLibreMap
  element: HTMLDivElement
  lib: typeof import('maplibre-gl')
  loaded: boolean
  theme: 'light' | 'dark'
  pins: Map<string, { marker: Marker; icon: Root }>
  me: Marker
  ring: HTMLSpanElement
  at: Position
}

let kept: KeptMini | null = null

// A map that didn't load in time: forget it, so the next visit makes a fresh one.
function dropMiniMap(): void {
  if (!kept) return
  const old = kept
  kept = null
  try {
    old.map.remove()
  } catch {
    // Its WebGL context is already gone.
  }
  old.element.remove()
  queueMicrotask(() => old.pins.forEach((p) => p.icon.unmount()))
}

const reducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function MiniMap({ centre, places }: { centre: Position; places: Ranked<Service>[] }) {
  const { online } = useAppData()
  const { accuracy } = usePhoneLocation()
  const { resolved } = useTheme()
  const box = useRef<HTMLDivElement>(null)
  const centreRef = useRef(centre)
  const placesRef = useRef(places)
  const accuracyRef = useRef(accuracy)
  const [visible, setVisible] = useState(() => !!kept)
  const [state, setState] = useState<'idle' | 'ready' | 'failed'>(() => (kept?.loaded ? 'ready' : 'idle'))

  useEffect(() => {
    centreRef.current = centre
    placesRef.current = places
    accuracyRef.current = accuracy
  })

  // Start only when the card scrolls into view (a kept map is shown at once).
  useEffect(() => {
    const el = box.current
    if (visible || !el || typeof IntersectionObserver === 'undefined') return
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
  }, [visible])

  // You in the middle, zoomed so the pinned places fit around you: the bounds are mirrored through
  // your position, so centring on you never pushes a pin off the card.
  const frame = (k: KeptMini) => {
    const c = centreRef.current
    const pts = placesRef.current.map((p) => ({ lat: p.item.lat!, lng: p.item.lng! }))
    let zoom = 15
    if (pts.length) {
      const dLat = Math.max(...pts.map((p) => Math.abs(p.lat - c.lat)), 0.002)
      const dLng = Math.max(...pts.map((p) => Math.abs(p.lng - c.lng)), 0.002)
      const camera = k.map.cameraForBounds(
        [
          [c.lng - dLng, c.lat - dLat],
          [c.lng + dLng, c.lat + dLat],
        ],
        // A pin stands 33px above its point, and the map credit takes the bottom 20px.
        { padding: { top: 56, bottom: 30, left: 24, right: 24 }, maxZoom: 16 },
      )
      zoom = Math.max(12, camera?.zoom ?? 15)
    }
    k.at = c
    k.me.setLngLat([c.lng, c.lat])
    k.map.jumpTo({ center: [c.lng, c.lat], zoom })
    sizeRing(k)
    declutter(k)
  }

  // Pins that would sit on a nearer one are left off (the list under the map still has them), and
  // nearer pins draw on top, so the card never shows a pile of half-hidden icons.
  const declutter = (k: KeptMini) => {
    const drawn: { x: number; y: number }[] = []
    placesRef.current.forEach((p, rank) => {
      const pin = k.pins.get(p.item.id)
      if (!pin) return
      const { x, y } = k.map.project([p.item.lng!, p.item.lat!])
      const clash = drawn.some((d) => Math.abs(d.x - x) < PIN_GAP_PX && Math.abs(d.y - y) < PIN_GAP_PX)
      const el = pin.marker.getElement()
      el.style.visibility = clash ? 'hidden' : ''
      el.style.zIndex = String(MINI_PINS - rank)
      if (!clash) drawn.push({ x, y })
    })
  }

  const sizeRing = (k: KeptMini) => {
    const px = accuracyPx(accuracyRef.current, k.at.lat, k.map.getZoom())
    k.ring.style.display = px ? 'block' : 'none'
    if (px) k.ring.style.setProperty('--ring', `${px}px`)
  }

  // The pins: the nearest places now. Only the ones that changed are added or removed.
  const syncPins = (k: KeptMini) => {
    const want = new Set(placesRef.current.map((p) => p.item.id))
    for (const [id, pin] of k.pins) {
      if (want.has(id)) continue
      pin.marker.remove()
      queueMicrotask(() => pin.icon.unmount())
      k.pins.delete(id)
    }
    for (const p of placesRef.current) {
      if (k.pins.has(p.item.id)) continue
      const el = document.createElement('span')
      el.className = styles.pin
      el.dataset.category = p.item.category
      const Icon = CATEGORY_ICONS[p.item.category]
      const icon = createRoot(el)
      icon.render(<Icon size={14} weight="bold" aria-hidden="true" />)
      const marker = new k.lib.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.item.lng!, p.item.lat!]).addTo(k.map)
      k.pins.set(p.item.id, { marker, icon })
    }
  }

  // Put the map on the card: the kept one, or a new one once the card is on screen and online.
  const canDraw = visible && (online || !!kept)
  useEffect(() => {
    if (!canDraw || !box.current) return
    let cancelled = false
    let timer = 0
    let resize: ResizeObserver | null = null
    const watchSize = (k: KeptMini) => {
      // The card can change width (fonts, the data notice, rotating the phone): redraw at the new
      // size and put you back in the middle.
      if (typeof ResizeObserver === 'undefined' || !box.current) return
      resize = new ResizeObserver(() => {
        k.map.resize()
        frame(k)
      })
      resize.observe(box.current)
    }

    if (kept) {
      const k = kept
      if (k.element.parentElement !== box.current) box.current.appendChild(k.element)
      k.map.resize()
      syncPins(k)
      if (k.loaded) frame(k)
      watchSize(k)
      return () => {
        resize?.disconnect()
        k.element.remove()
      }
    }

    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 300))
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout
    const handle = idle(async () => {
      if (cancelled || !box.current) return
      if (!hasWebGL()) return setState('failed')
      try {
        timer = window.setTimeout(() => {
          if (cancelled) return
          dropMiniMap()
          setState('failed')
        }, LOAD_TIMEOUT_MS)
        const [[ml], style] = await Promise.all([
          Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]),
          themedStyle(resolved),
        ])
        if (cancelled || !box.current) return
        const c = centreRef.current
        const element = document.createElement('div')
        element.className = styles.map
        box.current.appendChild(element)
        const m = new ml.Map({
          ...mapRenderOptions(),
          container: element,
          style,
          center: [c.lng, c.lat],
          zoom: 14,
          // A picture, not a widget: no drag, no zoom, so it never moves and never traps the scroll.
          interactive: false,
        })
        // You: the accuracy ring under the blue dot, in one marker.
        const meEl = document.createElement('span')
        meEl.className = styles.you
        const ring = document.createElement('span')
        ring.className = styles.ring
        const dot = document.createElement('span')
        dot.className = styles.me
        meEl.append(ring, dot)
        const k: KeptMini = {
          map: m,
          element,
          lib: ml,
          loaded: false,
          theme: resolved,
          pins: new Map(),
          me: new ml.Marker({ element: meEl }).setLngLat([c.lng, c.lat]).addTo(m),
          ring,
          at: c,
        }
        kept = k
        syncPins(k)
        m.once('load', () => {
          window.clearTimeout(timer)
          k.loaded = true
          if (cancelled) return
          setState('ready')
          frame(k)
        })
        watchSize(k)
      } catch {
        if (!cancelled) setState('failed')
      }
    })
    return () => {
      cancelled = true
      cancelIdle(handle as number)
      window.clearTimeout(timer)
      resize?.disconnect()
      kept?.element.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDraw])

  // New nearest places (moved to another part of town, data refreshed): new pins and a new frame.
  const pinKey = places.map((p) => p.item.id).join(',')
  useEffect(() => {
    if (state !== 'ready' || !kept) return
    syncPins(kept)
    frame(kept)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey, state])

  // Follow the phone: the dot and the view glide together to each new fix; a long jump is a cut.
  const { lat, lng } = centre
  useEffect(() => {
    const k = kept
    if (state !== 'ready' || !k) return
    const from = k.at
    const to = { lat, lng }
    if (from.lat === to.lat && from.lng === to.lng) return sizeRing(k)
    if (reducedMotion() || shouldCut(from, to)) {
      frame(k)
      return
    }
    let raf = 0
    const start = performance.now()
    const step = (now: number) => {
      const p = glideAt(from, to, (now - start) / GLIDE_MS)
      k.at = p
      k.me.setLngLat([p.lng, p.lat])
      k.map.jumpTo({ center: [p.lng, p.lat] })
      if (now - start < GLIDE_MS) raf = requestAnimationFrame(step)
      else sizeRing(k)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, state])

  useEffect(() => {
    if (state === 'ready' && kept) sizeRing(kept)
  }, [accuracy, state])

  useEffect(() => {
    if (state !== 'ready' || !kept || kept.theme === resolved) return
    applyMapTheme(kept.map, resolved)
    kept.theme = resolved
  }, [resolved, state])

  if (state === 'failed') return null
  return (
    <Link to="/map" className={`${styles.card} ${state === 'ready' ? '' : styles.waiting}`} aria-label="Open the map">
      <div ref={box} className={`${styles.box} ${state === 'ready' ? styles.shown : ''}`} aria-hidden="true" />
      {/* The licence credit as quiet text; the full credit and links are on the Map tab and About. */}
      <span className={styles.credit}>{MAP_CREDIT.text}</span>
    </Link>
  )
}
