import { Check, ChevronLeft, ChevronRight, CircleCheck, Map as MapIcon, Phone, Route, Siren } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { SectionHead } from '../components/Cards.tsx'
import DataNotice from '../components/DataNotice.tsx'
import { CATEGORY_ICONS, ICON_STROKE } from '../components/icons.ts'
import { FeatureTags, StatusLine } from '../components/PlaceInfo.tsx'
import RopiSays from '../components/RopiSays.tsx'
import SaveButton from '../components/SaveButton.tsx'
import { formatDate, telHref } from '../data/format.ts'
import { categoryFromSlug, categoryLabel } from '../data/labels.ts'
import { placeHref, routeHref } from '../data/links.ts'
import { useNearby } from '../data/useNearby.ts'
import { openStatus, shortStatus } from '../rules/hours.ts'
import { CHIP_LABELS, needById, needForCategory, rankForNeed, type Chip, type Need } from '../rules/needs.ts'
import { formatDistance, type Ranked } from '../rules/nearby.ts'
import { isNew } from '../rules/services.ts'
import type { Labels, Service } from '../types.ts'
import NotFoundPage from './NotFoundPage.tsx'
import styles from './Page.module.css'

const kindOf = (s: Service, labels: Labels | null) => s.subtype ?? categoryLabel(s.category, labels)

// The nearest place, big: how far, what it is, whether it's usually open, what it offers, when it
// was checked, and two large buttons, Call and Route. The first thing a stranded driver needs.
function NearestCard({ place, need, labels, now }: { place: Ranked<Service>; need: Need; labels: Labels | null; now: Date }) {
  const { item: s, km } = place
  const Icon = CATEGORY_ICONS[s.category]
  const route = routeHref(s)
  return (
    <article className={`${styles.card} ${styles.nearest}`} aria-labelledby={`${s.id}-name`}>
      <div className={styles.cardHead}>
        <p className={styles.nearestDistance}>
          <Icon size={18} strokeWidth={2} aria-hidden="true" />
          {km !== null ? `${formatDistance(km)} away` : 'Nearest listed'}
        </p>
        {isNew(s, now) && <span className={styles.newBadge}>NEW</span>}
        {s.sample && <span className={styles.sample}>SAMPLE</span>}
        <SaveButton id={s.id} name={s.name} />
      </div>
      <h2 id={`${s.id}-name`} className={styles.nearestName}>
        <Link className={styles.nameLink} to={placeHref(s)}>
          {s.name}
        </Link>
      </h2>
      <p className={styles.meta}>
        {kindOf(s, labels)} · {s.landmark}
      </p>
      <StatusLine service={s} now={now} />
      <FeatureTags service={s} show={need.shows} />
      <p className={styles.checked}>
        <CircleCheck size={15} strokeWidth={2} aria-hidden="true" />
        Last checked {formatDate(s.verifiedAt)} · hours can change, call first
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

// One more place: tap it for its details, or call straight from the row.
function MoreRow({ place, labels, now }: { place: Ranked<Service>; labels: Labels | null; now: Date }) {
  const { item: s, km } = place
  const Icon = CATEGORY_ICONS[s.category]
  const status = openStatus(s, now)
  const word = shortStatus(status)
  return (
    <li className={styles.row}>
      <Icon className={styles.rowIcon} size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <Link className={`${styles.rowText} ${styles.rowLink}`} to={placeHref(s)}>
        <p className={styles.rowTitle}>
          {s.name}
          {isNew(s, now) && <span className={styles.newBadge}>NEW</span>}
        </p>
        <p className={styles.rowMeta}>
          {kindOf(s, labels)}
          {km !== null && ` · ${formatDistance(km)}`}
          {word && (
            <>
              {' · '}
              <span className={status.state === 'open' ? styles.statusOpen : undefined}>{word}</span>
            </>
          )}
        </p>
      </Link>
      {s.phone && (
        <a className={styles.rowCall} href={telHref(s.phone)} aria-label={`Call ${s.name}`}>
          <Phone size={18} strokeWidth={2} aria-hidden="true" />
        </a>
      )}
    </li>
  )
}

// Nearby results: the same layout for every need, so people learn it once. Filter chips, the
// nearest place as a big card (and the nearest usually-open one when it's closed), then the rest.
// /nearby/<need>, and /services/<category> for links shared before needs existed.
export default function NearbyPage() {
  const params = useParams()
  const navigate = useNavigate()
  const canGoBack = useLocation().key !== 'default'
  const fromCategory = categoryFromSlug(params.category)
  const need = params.need !== undefined ? needById(params.need) : fromCategory ? needForCategory(fromCategory) : null
  const { ready, where, ranked, labels, position } = useNearby()
  const [chips, setChips] = useState<Chip[]>([])
  // One clock for the page, so every card agrees on "now".
  const [now] = useState(() => new Date())
  if (!need) return <NotFoundPage />

  const all = rankForNeed(ranked, need, [], now).places
  const { places, nearestOpen } = rankForNeed(ranked, need, chips, now)
  const [nearest, ...more] = places
  const toggle = (chip: Chip) => setChips((c) => (c.includes(chip) ? c.filter((x) => x !== chip) : [...c, chip]))
  const count = places.length

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
              ? `${count} ${count === 1 ? need.one : need.finds.toLowerCase()} ${where}${position && count > 1 ? ', nearest first' : ''}.`
              : need.finds}
          </p>
        </div>
        {all.length > 0 && (
          <Link
            className={`${styles.secondary} ${styles.mapButton}`}
            to={`/map?cat=${need.category}`}
            aria-label="Show on map"
          >
            <MapIcon size={18} strokeWidth={2} aria-hidden="true" />
            Map
          </Link>
        )}
      </div>

      {all.length > 0 && need.chips.length > 0 && (
        <div className={styles.chipRow} role="group" aria-label="Filter">
          {need.chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className={styles.filterChip}
              aria-pressed={chips.includes(chip)}
              onClick={() => toggle(chip)}
            >
              {chips.includes(chip) && <Check size={14} strokeWidth={2.5} aria-hidden="true" />}
              {CHIP_LABELS[chip]}
            </button>
          ))}
        </div>
      )}

      <DataNotice hasSamples={places.some((r) => r.item.sample)} ropi />

      {ready && all.length === 0 && (
        <div className={`${styles.card} ${styles.empty} ${styles.emptyMascot}`}>
          <RopiSays variant="thinking">
            No {need.finds.toLowerCase()} listed {where} yet.
          </RopiSays>
          <Link className={styles.secondary} to="/services">
            See other services
          </Link>
        </div>
      )}

      {ready && all.length > 0 && !nearest && (
        <div className={`${styles.card} ${styles.empty}`}>
          <p>No places match these filters {where}.</p>
          <button type="button" className={styles.secondary} onClick={() => setChips([])}>
            Clear filters
          </button>
        </div>
      )}

      {nearest && (
        <div className={styles.section}>
          <SectionHead title={position ? 'Nearest to you' : 'First listed'} />
          <NearestCard place={nearest} need={need} labels={labels} now={now} />
          {nearestOpen && (
            <Link className={styles.openInstead} to={placeHref(nearestOpen.item)}>
              <span>
                Nearest usually open at this time: <strong>{nearestOpen.item.name}</strong>
                {nearestOpen.km !== null && `, ${formatDistance(nearestOpen.km)}`}
              </span>
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </Link>
          )}
          {!position && <p className={styles.hint}>Turn on location to sort by distance.</p>}
        </div>
      )}

      {more.length > 0 && (
        <div className={styles.section}>
          <SectionHead title="More nearby" />
          <div className={styles.panel}>
            <ul className={styles.rows} aria-label={`More ${need.finds.toLowerCase()}`}>
              {more.map((p) => (
                <MoreRow key={p.item.id} place={p} labels={labels} now={now} />
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
