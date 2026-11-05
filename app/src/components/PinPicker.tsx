import { Crosshair, MapPin } from '@phosphor-icons/react'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePhoneLocation } from '../location/context.ts'
import { hasWebGL, LOAD_TIMEOUT_MS } from '../map/loadMap.ts'
import { applyMapTheme, mapRenderOptions, themedStyle } from '../map/mapTheme.ts'
import type { Position } from '../rules/nearby.ts'
import { useTheme } from '../theme.ts'
import type { Service } from '../types.ts'
import styles from './PinPicker.module.css'

// Where is the place? The pin stays fixed in the middle and the map moves under it: dragging a
// small marker with a thumb on a 360px screen is miserable. The phone's own spot shows as the blue
// dot, and places already listed as faded pins, so a duplicate is easy to see.
//
// When the map can't load (offline, no WebGL, too slow), the parent offers "Use where I'm standing".

export type PinState = 'loading' | 'ready' | 'failed'

export default function PinPicker({
  start,
  places,
  onMove,
  onState,
}: {
  start: Position
  places: Service[]
  onMove: (p: Position) => void
  onState: (s: PinState) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const meRef = useRef<Marker | null>(null)
  const { position } = usePhoneLocation()
  const { resolved } = useTheme()
  // Offline or no WebGL: say so at once, the parent shows "Use where I'm standing".
  const [state, setState] = useState<PinState>(() =>
    !hasWebGL() || (typeof navigator !== 'undefined' && !navigator.onLine) ? 'failed' : 'loading',
  )
  const report = useRef({ onMove, onState })
  useLayoutEffect(() => {
    report.current = { onMove, onState }
  })

  useEffect(() => {
    report.current.onState(state)
  }, [state])

  useEffect(() => {
    let cancelled = false
    let timer = 0
    if (state === 'failed') return
    void (async () => {
      try {
        timer = window.setTimeout(() => !cancelled && setState('failed'), LOAD_TIMEOUT_MS)
        const [[ml], style] = await Promise.all([
          Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]),
          themedStyle(resolved),
        ])
        if (cancelled || !box.current) return
        const m = new ml.Map({
          ...mapRenderOptions(),
          container: box.current,
          style,
          center: [start.lng, start.lat],
          zoom: 17,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
        })
        m.touchZoomRotate.disableRotation()
        mapRef.current = m
        for (const p of places) {
          if (p.lat === undefined || p.lng === undefined) continue
          const el = document.createElement('span')
          el.className = styles.other
          el.title = p.name
          new ml.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m)
        }
        const me = document.createElement('span')
        me.className = styles.me
        meRef.current = new ml.Marker({ element: me })
        m.on('moveend', () => {
          const c = m.getCenter()
          report.current.onMove({ lat: c.lat, lng: c.lng })
        })
        m.once('load', () => {
          window.clearTimeout(timer)
          if (!cancelled) setState('ready')
        })
      } catch {
        if (!cancelled) setState('failed')
      }
    })()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      mapRef.current?.remove()
      mapRef.current = null
    }
    // Made once; the start point and the places only matter when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (mapRef.current) applyMapTheme(mapRef.current, resolved)
  }, [resolved])

  // The blue dot follows the phone.
  useEffect(() => {
    const m = mapRef.current
    if (!m || !meRef.current || !position || state !== 'ready') return
    meRef.current.setLngLat([position.lng, position.lat]).addTo(m)
  }, [position, state])

  const backToMe = () => {
    if (mapRef.current && position) mapRef.current.easeTo({ center: [position.lng, position.lat], zoom: 18 })
  }

  return (
    <div className={styles.wrap}>
      <div ref={box} className={styles.map} aria-label="Map. Move it to put the pin on the place." role="application" />
      {state === 'ready' && (
        <>
          <span className={styles.pin} aria-hidden="true">
            <MapPin size={44} weight="fill" />
          </span>
          <p className={styles.hint}>Move the map to put the pin on the place.</p>
          {position && (
            <button type="button" className={styles.me48} onClick={backToMe} aria-label="Back to where I am">
              <Crosshair size={22} aria-hidden="true" />
            </button>
          )}
        </>
      )}
      {state === 'loading' && <p className={styles.loading}>Loading the map…</p>}
    </div>
  )
}
