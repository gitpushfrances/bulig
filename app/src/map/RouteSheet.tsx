import { Car, ChevronDown, ChevronUp, Footprints, Navigation, Phone } from 'lucide-react'
import { useRef, useState, type PointerEvent } from 'react'
import { CATEGORY_ICONS } from '../components/icons.ts'
import { directionsHref, telHref } from '../data/format.ts'
import { formatDistance } from '../rules/nearby.ts'
import type { Service } from '../types.ts'
import page from '../pages/Page.module.css'
import styles from '../pages/MapPage.module.css'
import { formatDuration, type Route, type TravelMode } from './route.ts'

export type RouteState =
  | { kind: 'off' }
  | { kind: 'no-location' }
  | { kind: 'loading' }
  | { kind: 'ready'; route: Route }
  | { kind: 'failed' }

interface Props {
  place: Service
  route: RouteState
  mode: TravelMode
  onMode: (mode: TravelMode) => void
  minimized: boolean
  onMinimize: () => void
  onExpand: () => void
  onEnd: () => void
}

// How far the bar must travel before letting go ends the route.
const SWIPE_END_PX = 96

function summary(route: RouteState): string {
  switch (route.kind) {
    case 'ready':
      return `${formatDistance(route.route.metres / 1000)} · ${formatDuration(route.route.seconds)}`
    case 'loading':
      return 'Finding the route…'
    case 'no-location':
      return 'Turn on location'
    case 'failed':
      return 'No route right now'
    default:
      return ''
  }
}

// The route, the way navigation apps do it: open with every detail, or minimized to a slim bar
// while the line stays on the map. Ending is deliberate (End route, or swiping the bar away), and
// the Map offers Undo right after, so a stray tap or swipe never costs the route.
export default function RouteSheet({ place, route, mode, onMode, minimized, onMinimize, onExpand, onEnd }: Props) {
  const Icon = CATEGORY_ICONS[place.category]

  if (minimized) return <RouteBar place={place} text={summary(route)} Icon={Icon} onExpand={onExpand} onEnd={onEnd} />

  return (
    <div className={styles.sheet} role="region" aria-label={`Route to ${place.name}`}>
      <div className={styles.sheetHead}>
        <div className={styles.sheetTitle}>
          <p className={page.meta}>Route to</p>
          <h2 className={page.cardTitle}>{place.name}</h2>
        </div>
        <button type="button" className={styles.close} onClick={onMinimize} aria-label="Minimize route">
          <ChevronDown size={22} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <p className={styles.routeInfo} aria-live="polite">
        {route.kind === 'ready' ? (
          <>
            <strong>{summary(route)}</strong> {mode === 'car' ? 'by car or motorbike' : 'on foot'}
          </>
        ) : route.kind === 'no-location' ? (
          'Turn on location to see the route from where you are.'
        ) : route.kind === 'failed' ? (
          "Couldn't get a route right now. Google Maps can still guide you."
        ) : (
          'Finding the best route…'
        )}
      </p>

      <div className={styles.modes} role="group" aria-label="Travel by">
        <button type="button" aria-pressed={mode === 'car'} onClick={() => onMode('car')}>
          <Car size={18} strokeWidth={2} aria-hidden="true" />
          Car
        </button>
        <button type="button" aria-pressed={mode === 'foot'} onClick={() => onMode('foot')}>
          <Footprints size={18} strokeWidth={2} aria-hidden="true" />
          Walk
        </button>
      </div>

      <div className={page.actions}>
        <a
          className={page.call}
          href={directionsHref(place.lat!, place.lng!)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Start in Google Maps to ${place.name}`}
        >
          <Navigation size={18} strokeWidth={2} aria-hidden="true" />
          Google Maps
        </a>
        {place.phone && (
          <a className={page.secondary} href={telHref(place.phone)} aria-label={`Call ${place.name}`}>
            <Phone size={18} strokeWidth={2} aria-hidden="true" />
            Call
          </a>
        )}
      </div>

      <button type="button" className={styles.endRoute} onClick={onEnd}>
        End route
      </button>
    </div>
  )
}

// The minimized route: tap to open it again, swipe it sideways to end it.
function RouteBar({
  place,
  text,
  Icon,
  onExpand,
  onEnd,
}: {
  place: Service
  text: string
  Icon: (typeof CATEGORY_ICONS)[keyof typeof CATEGORY_ICONS]
  onExpand: () => void
  onEnd: () => void
}) {
  const [dx, setDx] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const start = useRef<number | null>(null)
  const moved = useRef(false)

  const down = (e: PointerEvent<HTMLDivElement>) => {
    start.current = e.clientX
    moved.current = false
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current === null) return
    const d = e.clientX - start.current
    if (Math.abs(d) > 6) moved.current = true
    setDx(d)
  }
  const up = () => {
    if (start.current === null) return
    start.current = null
    setDragging(false)
    if (Math.abs(dx) >= SWIPE_END_PX) {
      // Slide the rest of the way out, then end.
      setLeaving(true)
      setDx(dx < 0 ? -window.innerWidth : window.innerWidth)
      window.setTimeout(onEnd, 180)
      return
    }
    setDx(0)
    if (!moved.current) onExpand()
  }
  const cancel = () => {
    start.current = null
    setDragging(false)
    setDx(0)
  }

  return (
    <div
      className={styles.routeBar}
      role="button"
      tabIndex={0}
      aria-label={`Route to ${place.name}, ${text}. Opens the route. Swipe sideways to end it.`}
      style={{
        transform: `translateX(${dx}px)`,
        opacity: Math.max(0.2, 1 - Math.abs(dx) / 320),
        transition: dragging && !leaving ? 'none' : undefined,
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onExpand()
        }
      }}
    >
      <span className={styles.routeBarIcon} aria-hidden="true">
        <Icon size={18} strokeWidth={2} />
      </span>
      <span className={styles.routeBarText}>
        <span className={styles.routeBarName}>{place.name}</span>
        <span className={styles.routeBarMeta}>{text}</span>
      </span>
      <ChevronUp className={styles.routeBarChevron} size={20} strokeWidth={2} aria-hidden="true" />
    </div>
  )
}
