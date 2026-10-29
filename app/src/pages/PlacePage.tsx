import { Check, ChevronLeft, CircleCheck, Link2, MapPin, Navigation, Phone, Route, Share2, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { CATEGORY_ICONS } from '../components/icons.ts'
import { StatusLine } from '../components/PlaceInfo.tsx'
import SaveButton from '../components/SaveButton.tsx'
import { useAppData } from '../data/context.ts'
import { formatDate, telHref } from '../data/format.ts'
import { categoryLabel } from '../data/labels.ts'
import { routeHref } from '../data/links.ts'
import { useNearby } from '../data/useNearby.ts'
import { DAY_NAMES, hoursForDay } from '../rules/hours.ts'
import { CHIP_LABELS, needForCategory } from '../rules/needs.ts'
import { formatDistance } from '../rules/nearby.ts'
import { isNew } from '../rules/services.ts'
import { DAYS, FEATURES, type Day } from '../types.ts'
import NotFoundPage from './NotFoundPage.tsx'
import styles from './Page.module.css'

// The week from Monday, the way people read a schedule.
const WEEK: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

// One place, everything about it: what and where, whether it's usually open, the week's hours,
// what it offers, when it was checked, and Call, Route, Save and Share. A link to it can be shared.
export default function PlacePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const canGoBack = useLocation().key !== 'default'
  const { data } = useAppData()
  const { ranked, labels } = useNearby()
  const [now] = useState(() => new Date())
  const [shared, setShared] = useState<'copied' | null>(null)

  if (data.status !== 'ready') return <p className={styles.notice}>Loading…</p>
  const place = data.services.find((s) => s.id === id)
  if (!place) return <NotFoundPage />

  const Icon = CATEGORY_ICONS[place.category]
  const km = ranked.find((r) => r.item.id === place.id)?.km ?? null
  const area = data.areas.find((a) => a.id === place.area)
  const kind = place.subtype ?? categoryLabel(place.category, labels)
  const need = needForCategory(place.category)
  const route = routeHref(place)
  const today = DAYS[now.getDay()]
  const hasHours = !!place.open24h || !!place.weeklyHours
  const features = FEATURES.filter((f) => place.features?.[f] !== undefined)

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: place.name, text: `${place.name} · ${kind} on Bulig`, url })
      } catch {
        // Cancelled: nothing to do.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setShared('copied')
    } catch {
      // No clipboard either (old browser, insecure page): the address bar still has the link.
    }
  }

  return (
    <article className={`${styles.page} ${styles.readable}`} aria-labelledby="place-title">
      <button type="button" className={styles.back} onClick={() => (canGoBack ? navigate(-1) : navigate(`/nearby/${need.id}`))}>
        <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        Back
      </button>

      <header className={styles.placeHead}>
        <p className={styles.meta}>
          <Icon size={16} strokeWidth={2} aria-hidden="true" />
          {kind}
          {area && ` · ${area.name}`}
        </p>
        <div className={styles.cardHead}>
          <h1 id="place-title" className={styles.title}>
            {place.name}
          </h1>
          {isNew(place, now) && <span className={styles.newBadge}>NEW</span>}
          {place.sample && <span className={styles.sample}>SAMPLE</span>}
          <SaveButton id={place.id} name={place.name} />
        </div>
        <p className={styles.detail}>
          <MapPin size={14} strokeWidth={2} aria-hidden="true" />
          {km !== null && <strong className={styles.distance}>{formatDistance(km)} away · </strong>}
          {place.landmark}
        </p>
        <StatusLine service={place} now={now} />
      </header>

      <div className={`${styles.actions} ${styles.bigActions}`}>
        {place.phone && (
          <a className={styles.call} href={telHref(place.phone)} aria-label={`Call ${place.name}`}>
            <Phone size={20} strokeWidth={2} aria-hidden="true" />
            {need.urgent ? 'Call hospital' : 'Call'}
          </a>
        )}
        {route && (
          <Link className={styles.secondary} to={route} aria-label={`Route to ${place.name}`}>
            <Route size={20} strokeWidth={2} aria-hidden="true" />
            Route
          </Link>
        )}
        <button type="button" className={styles.secondary} onClick={share} aria-label={`Share ${place.name}`}>
          {shared ? <Link2 size={20} strokeWidth={2} aria-hidden="true" /> : <Share2 size={20} strokeWidth={2} aria-hidden="true" />}
          {shared ? 'Link copied' : 'Share'}
        </button>
      </div>
      {place.phone && <p className={`${styles.number} ${styles.placePhone}`}>{place.phone}</p>}

      <section className={styles.section} aria-labelledby="hours-title">
        <h2 id="hours-title" className={styles.sectionTitle}>
          Usual hours
        </h2>
        {hasHours ? (
          <>
            <dl className={`${styles.panel} ${styles.week}`}>
              {WEEK.map((day) => (
                <div key={day} className={day === today ? styles.today : undefined}>
                  <dt>
                    {DAY_NAMES[day]}
                    {day === today && <span className={styles.todayTag}>Today</span>}
                  </dt>
                  <dd>{hoursForDay(place, day)}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.hint}>Hours can change, especially on holidays. Call first.</p>
          </>
        ) : (
          <p className={styles.card}>
            {place.hours ? `Reported as: ${place.hours}. ` : ''}Usual hours aren&apos;t recorded yet. Call to check.
          </p>
        )}
      </section>

      {features.length > 0 && (
        <section className={styles.section} aria-labelledby="offers-title">
          <h2 id="offers-title" className={styles.sectionTitle}>
            What it offers
          </h2>
          <ul className={styles.tags}>
            {features.map((f) =>
              place.features?.[f] ? (
                <li key={f} className={styles.tagYes}>
                  <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                  {CHIP_LABELS[f]}
                </li>
              ) : (
                <li key={f} className={styles.tagNo}>
                  <X size={14} strokeWidth={2.5} aria-hidden="true" />
                  No {CHIP_LABELS[f].toLowerCase()}
                </li>
              ),
            )}
          </ul>
          <p className={styles.hint}>Only what someone has confirmed is listed.</p>
        </section>
      )}

      <section className={styles.section} aria-labelledby="checked-title">
        <h2 id="checked-title" className={styles.sectionTitle}>
          Checked
        </h2>
        <p className={styles.checked}>
          <CircleCheck size={15} strokeWidth={2} aria-hidden="true" />
          Last checked {formatDate(place.verifiedAt)}
        </p>
        <p className={styles.hint}>Source: {place.source}</p>
      </section>

      {route && (
        <a
          className={`${styles.more} ${styles.googleLink}`}
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
          target="_blank"
          rel="noreferrer"
        >
          <Navigation size={16} strokeWidth={2} aria-hidden="true" />
          Open in Google Maps
        </a>
      )}
    </article>
  )
}
