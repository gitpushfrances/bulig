import { ChevronLeft, CircleCheck, Clock, Map as MapIcon, Phone, Route, Siren } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { SectionHead } from '../components/Cards.tsx'
import DataNotice from '../components/DataNotice.tsx'
import { CATEGORY_ICONS, ICON_STROKE } from '../components/icons.ts'
import RopiSays from '../components/RopiSays.tsx'
import SaveButton from '../components/SaveButton.tsx'
import { formatDate, telHref } from '../data/format.ts'
import { categoryFromSlug, categoryLabel } from '../data/labels.ts'
import { useNearby } from '../data/useNearby.ts'
import { needById, needForCategory, type Need } from '../rules/needs.ts'
import { formatDistance, type Ranked } from '../rules/nearby.ts'
import { isNew } from '../rules/services.ts'
import type { Labels, Service } from '../types.ts'
import NotFoundPage from './NotFoundPage.tsx'
import styles from './Page.module.css'

const kindOf = (s: Service, labels: Labels | null) => s.subtype ?? categoryLabel(s.category, labels)
const routeTo = (s: Service) => (s.lat !== undefined && s.lng !== undefined ? `/map?to=${encodeURIComponent(s.id)}` : null)

// The nearest place, big: how far, what it is, when it's usually open, when it was checked,
// and two large buttons, Call and Route. The first thing a stranded driver needs.
function NearestCard({ place, need, labels }: { place: Ranked<Service>; need: Need; labels: Labels | null }) {
  const { item: s, km } = place
  const Icon = CATEGORY_ICONS[s.category]
  const route = routeTo(s)
  return (
    <article className={`${styles.card} ${styles.nearest}`} aria-labelledby={`${s.id}-name`}>
      <div className={styles.cardHead}>
        <p className={styles.nearestDistance}>
          <Icon size={18} strokeWidth={2} aria-hidden="true" />
          {km !== null ? `${formatDistance(km)} away` : 'Nearest listed'}
        </p>
        {isNew(s, new Date()) && <span className={styles.newBadge}>NEW</span>}
        {s.sample && <span className={styles.sample}>SAMPLE</span>}
        <SaveButton id={s.id} name={s.name} />
      </div>
      <h2 id={`${s.id}-name`} className={styles.nearestName}>
        {s.name}
      </h2>
      <p className={styles.meta}>
        {kindOf(s, labels)} · {s.landmark}
      </p>
      {s.hours && (
        <p className={styles.detail}>
          <Clock size={14} strokeWidth={2} aria-hidden="true" />
          Usually {s.hours.toLowerCase().startsWith('24') ? 'open 24 hours' : s.hours} · hours can change, call first
        </p>
      )}
      <p className={styles.checked}>
        <CircleCheck size={15} strokeWidth={2} aria-hidden="true" />
        Last checked {formatDate(s.verifiedAt)}
      </p>
      <div className={`${styles.actions} ${styles.bigActions}`}>
        {s.phone && (
          <a className={styles.call} href={telHref(s.phone)} aria-label={`Call ${s.name}`}>
            <Phone size={20} strokeWidth={2} aria-hidden="true" />
            {need.urgent ? 'Call hospital' : 'Call'}
          </a>
        )}
        {route && (
          <Link className={styles.secondary} to={route} aria-label={`Route to ${s.name}`}>
            <Route size={20} strokeWidth={2} aria-hidden="true" />
            Route
          </Link>
        )}
      </div>
    </article>
  )
}

// One more place: tap the name for its route, or call straight from the row.
function MoreRow({ place, labels }: { place: Ranked<Service>; labels: Labels | null }) {
  const { item: s, km } = place
  const Icon = CATEGORY_ICONS[s.category]
  const route = routeTo(s)
  const text = (
    <>
      <p className={styles.rowTitle}>
        {s.name}
        {isNew(s, new Date()) && <span className={styles.newBadge}>NEW</span>}
      </p>
      <p className={styles.rowMeta}>
        {kindOf(s, labels)}
        {km !== null && ` · ${formatDistance(km)}`}
        {s.hours && ` · ${s.hours}`}
      </p>
    </>
  )
  return (
    <li className={styles.row}>
      <Icon className={styles.rowIcon} size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
      {route ? (
        <Link className={`${styles.rowText} ${styles.rowLink}`} to={route} aria-label={`Route to ${s.name}`}>
          {text}
        </Link>
      ) : (
        <div className={styles.rowText}>{text}</div>
      )}
      {s.phone && (
        <a className={styles.rowCall} href={telHref(s.phone)} aria-label={`Call ${s.name}`}>
          <Phone size={18} strokeWidth={2} aria-hidden="true" />
        </a>
      )}
    </li>
  )
}

// Nearby results: the same layout for every need, so people learn it once. The nearest place as a
// big card, then the rest as rows, nearest first. /nearby/<need>, and /services/<category> for links
// shared before needs existed.
export default function NearbyPage() {
  const params = useParams()
  const navigate = useNavigate()
  const canGoBack = useLocation().key !== 'default'
  const fromCategory = categoryFromSlug(params.category)
  const need = params.need !== undefined ? needById(params.need) : fromCategory ? needForCategory(fromCategory) : null
  const { ready, where, ranked, labels, position } = useNearby()
  if (!need) return <NotFoundPage />

  const places = ranked.filter((r) => r.item.category === need.category)
  const [nearest, ...more] = places

  return (
    <section className={`${styles.page} ${styles.readable}`} aria-labelledby="nearby-title">
      <button type="button" className={styles.back} onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}>
        <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        Back
      </button>

      <div className={styles.nearbyHead}>
        <div className={styles.intro}>
          <h1 id="nearby-title" className={styles.title}>
            {need.label}
          </h1>
          <p className={styles.lead}>
            {ready
              ? `${places.length} ${places.length === 1 ? need.one : need.finds.toLowerCase()} ${where}${position && places.length > 1 ? ', nearest first' : ''}.`
              : need.finds}
          </p>
        </div>
        {places.length > 0 && (
          <Link className={`${styles.secondary} ${styles.mapButton}`} to={`/map?cat=${need.category}`} aria-label="Show on map">
            <MapIcon size={18} strokeWidth={2} aria-hidden="true" />
            Map
          </Link>
        )}
      </div>

      <DataNotice hasSamples={places.some((r) => r.item.sample)} ropi />

      {ready && !nearest && (
        <div className={`${styles.card} ${styles.empty} ${styles.emptyMascot}`}>
          <RopiSays variant="thinking">
            No {need.finds.toLowerCase()} listed {where} yet.
          </RopiSays>
          <Link className={styles.secondary} to="/services">
            See other services
          </Link>
        </div>
      )}

      {nearest && (
        <div className={styles.section}>
          <SectionHead title={position ? 'Nearest to you' : 'First listed'} />
          <NearestCard place={nearest} need={need} labels={labels} />
          {!position && <p className={styles.hint}>Turn on location to sort by distance.</p>}
        </div>
      )}

      {more.length > 0 && (
        <div className={styles.section}>
          <SectionHead title="More nearby" />
          <div className={styles.panel}>
            <ul className={styles.rows} aria-label={`More ${need.finds.toLowerCase()}`}>
              {more.map((p) => (
                <MoreRow key={p.item.id} place={p} labels={labels} />
              ))}
            </ul>
          </div>
        </div>
      )}

      {need.urgent && (
        <Link className={`${styles.notice} ${styles.urgentNote}`} to="/emergency">
          <Siren size={18} strokeWidth={2} aria-hidden="true" />
          <span>
            <strong>Life-threatening?</strong> Call 911 now.
          </span>
        </Link>
      )}
    </section>
  )
}
