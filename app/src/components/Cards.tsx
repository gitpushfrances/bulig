import { ChevronRight, CircleCheck, Clock, MapPin, Navigation, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { directionsHref, formatDate, telHref } from '../data/format.ts'
import { categoryBlurb, categoryLabel, categorySlug, kindLabel } from '../data/labels.ts'
import { formatDistance, type Ranked } from '../rules/nearby.ts'
import { isNew } from '../rules/services.ts'
import { CATEGORIES, type Category, type EmergencyContact, type Labels, type Service } from '../types.ts'
import styles from '../pages/Page.module.css'
import { CATEGORY_ICONS, ICON_STROKE, KIND_ICONS } from './icons.ts'
import SaveButton from './SaveButton.tsx'

function Checked({ date }: { date: string }) {
  return (
    <p className={styles.checked}>
      <CircleCheck size={15} strokeWidth={2} aria-hidden="true" />
      Last checked {formatDate(date)}
    </p>
  )
}

function Sample() {
  return <span className={styles.sample}>SAMPLE</span>
}

// New stalls get noticed. A badge only: it never moves a place up the list.
function New() {
  return <span className={styles.newBadge}>NEW</span>
}

// The owner's own word ("Halo-halo") when there is one, else the category name.
function kindOf(service: Service, labels: Labels | null): string {
  return service.subtype ?? categoryLabel(service.category, labels)
}

// A section heading with an optional "see all" link on the right.
export function SectionHead({ title, to, more = 'See all', children }: {
  title: string
  to?: string
  more?: string
  children?: ReactNode
}) {
  return (
    <div className={styles.sectionHead}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
      {to && (
        <Link className={styles.more} to={to}>
          {more}
          <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

// The country's national line: the biggest thing on Emergency Help, never hidden.
export function HotlineCard({
  contact,
  countryName,
  compact = false,
}: {
  contact: EmergencyContact
  countryName: string
  compact?: boolean
}) {
  const titleId = `${contact.id}-title`
  return (
    <section className={`${styles.hotline} ${compact ? styles.hotlineCompact : ''}`} aria-labelledby={titleId}>
      <div className={styles.hotlineHead}>
        <h2 id={titleId} className={styles.hotlineName}>
          <KIND_ICONS.national size={18} strokeWidth={2} aria-hidden="true" />
          {contact.name}
        </h2>
        <span>{countryName}</span>
      </div>
      <div className={styles.hotlineBody}>
        <p className={styles.hotlineNumber}>{contact.phones[0]}</p>
        <div className={styles.hotlineActions}>
          {contact.phones.map((phone, i) => (
            <a
              key={phone}
              className={`${styles.call} ${i === 0 ? styles.hotlineCall : styles.hotlineSecondary}`}
              href={telHref(phone)}
              aria-label={`Call ${contact.name} at ${phone}`}
            >
              <Phone size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
              Call {phone}
            </a>
          ))}
        </div>
      </div>
      {contact.verifiedAt && !compact && <Checked date={contact.verifiedAt} />}
    </section>
  )
}

export function ContactCard({ contact, areaName }: { contact: EmergencyContact; areaName?: string }) {
  const Icon = KIND_ICONS[contact.kind]
  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardHeading}>
          <h3 className={styles.cardTitle}>{contact.name}</h3>
          <p className={styles.meta}>
            <Icon size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {kindLabel(contact.kind)}
            {areaName && ` · ${areaName}`}
          </p>
        </div>
        {contact.sample && <Sample />}
        <SaveButton id={contact.id} name={contact.name} />
      </div>
      {contact.phones.map((phone, i) => (
        <div key={phone} className={styles.phoneRow}>
          <span className={styles.number}>{phone}</span>
          <a
            className={i === 0 ? styles.call : styles.secondary}
            href={telHref(phone)}
            aria-label={`Call ${contact.name} at ${phone}`}
          >
            <Phone size={18} strokeWidth={2} aria-hidden="true" />
            Call
          </a>
        </div>
      ))}
      <Checked date={contact.verifiedAt} />
    </li>
  )
}

export function ServiceCard({
  service,
  labels,
  areaName,
  km = null,
}: {
  service: Service
  labels: Labels | null
  areaName?: string
  km?: number | null
}) {
  const Icon = CATEGORY_ICONS[service.category]
  const hasMap = service.lat !== undefined && service.lng !== undefined
  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardHeading}>
          <h3 className={styles.cardTitle}>{service.name}</h3>
          <p className={styles.meta}>
            <Icon size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {kindOf(service, labels)} · {service.landmark}
          </p>
        </div>
        {isNew(service, new Date()) && <New />}
        {service.sample && <Sample />}
        <SaveButton id={service.id} name={service.name} />
      </div>
      {(km !== null || service.hours || areaName) && (
        <div className={styles.details}>
          {km !== null && (
            <p className={`${styles.detail} ${styles.distance}`}>
              <Navigation size={14} strokeWidth={2} aria-hidden="true" />
              {formatDistance(km)} away
            </p>
          )}
          {service.hours && (
            <p className={styles.detail}>
              <Clock size={14} strokeWidth={2} aria-hidden="true" />
              {service.hours}
            </p>
          )}
          {areaName && (
            <p className={styles.detail}>
              <MapPin size={14} strokeWidth={2} aria-hidden="true" />
              {areaName}
            </p>
          )}
        </div>
      )}
      {(service.phone || hasMap) && (
        <div className={styles.actions}>
          {service.phone && (
            <a className={styles.call} href={telHref(service.phone)} aria-label={`Call ${service.name}`}>
              <Phone size={18} strokeWidth={2} aria-hidden="true" />
              Call
            </a>
          )}
          {hasMap && (
            <a
              className={styles.secondary}
              href={directionsHref(service.lat!, service.lng!)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Directions to ${service.name}`}
            >
              <Navigation size={18} strokeWidth={2} aria-hidden="true" />
              Directions
            </a>
          )}
        </div>
      )}
      <Checked date={service.verifiedAt} />
    </li>
  )
}

// One category on What we offer. The whole card opens its list.
export function OfferCard({
  category,
  labels,
  count,
  nearestKm,
  compact = false,
}: {
  category: Category
  labels: Labels | null
  count: number
  nearestKm: number | null
  compact?: boolean
}) {
  const Icon = CATEGORY_ICONS[category]
  return (
    <Link
      to={`/services/${categorySlug(category)}`}
      className={`${styles.offer} ${compact ? styles.offerCompact : ''} ${count === 0 ? styles.offerEmpty : ''}`}
    >
      <span className={styles.offerTop}>
        <Icon className={styles.offerIcon} size={compact ? 22 : 26} strokeWidth={1.6} aria-hidden="true" />
        <ChevronRight className={styles.offerArrow} size={18} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className={styles.offerName}>{categoryLabel(category, labels)}</span>
      {!compact && <span className={styles.offerBlurb}>{categoryBlurb(category)}</span>}
      <span className={styles.offerFoot}>
        {count === 0 ? 'None listed yet' : `${count} ${count === 1 ? 'place' : 'places'}`}
        {count > 0 && nearestKm !== null && <span> · {formatDistance(nearestKm)}</span>}
      </span>
    </Link>
  )
}

// A one-line place for previews: name, what it is, how far, and a call button.
export function PlaceRow({ service, labels, km }: { service: Service; labels: Labels | null; km: number | null }) {
  const Icon = CATEGORY_ICONS[service.category]
  return (
    <li className={styles.row}>
      <Icon className={styles.rowIcon} size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <div className={styles.rowText}>
        <p className={styles.rowTitle}>{service.name}</p>
        <p className={styles.rowMeta}>
          {kindOf(service, labels)}
          {km !== null && ` · ${formatDistance(km)}`}
        </p>
      </div>
      {service.phone && (
        <a className={styles.rowCall} href={telHref(service.phone)} aria-label={`Call ${service.name}`}>
          <Phone size={18} strokeWidth={2} aria-hidden="true" />
        </a>
      )}
    </li>
  )
}

export function NumberRow({ contact }: { contact: EmergencyContact }) {
  const Icon = KIND_ICONS[contact.kind]
  const phone = contact.phones[0]
  return (
    <li className={styles.row}>
      <Icon className={styles.rowIcon} size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <div className={styles.rowText}>
        <p className={styles.rowTitle}>{contact.name}</p>
        <p className={`${styles.rowMeta} ${styles.tabular}`}>
          {kindLabel(contact.kind)} · {phone}
        </p>
      </div>
      <a className={styles.rowCall} href={telHref(phone)} aria-label={`Call ${contact.name} at ${phone}`}>
        <Phone size={18} strokeWidth={2} aria-hidden="true" />
      </a>
    </li>
  )
}

// Home's services at a glance: the first kind as a large tile with its nearest place, the rest as
// small tiles. Others (new and local stalls) closes the grid as a wide tile. Eight tiles fill a
// 2-column grid on phones and a 4-column grid from tablets exactly.
export function ServiceBento({ ranked, labels }: { ranked: Ranked<Service>[]; labels: Labels | null }) {
  return (
    <nav className={styles.bento} aria-label="Common services">
      {CATEGORIES.map((category, i) => {
        const Icon = CATEGORY_ICONS[category]
        const inCategory = ranked.filter((r) => r.item.category === category)
        const nearest = inCategory[0]
        const feature = i === 0
        const wide = category === 'other'
        const fresh = wide && inCategory.some((r) => isNew(r.item, new Date()))
        return (
          <Link
            key={category}
            to={`/services/${categorySlug(category)}`}
            className={`${styles.bentoTile} ${feature ? styles.bentoFeature : ''} ${wide ? styles.bentoWide : ''}`}
          >
            <Icon className={styles.offerIcon} size={feature ? 30 : 22} strokeWidth={1.6} aria-hidden="true" />
            <span className={styles.bentoName}>
              {categoryLabel(category, labels)}
              {fresh && <New />}
            </span>
            {(feature || wide) && <span className={styles.offerBlurb}>{categoryBlurb(category)}</span>}
            <span className={styles.bentoFoot}>
              {inCategory.length === 0
                ? 'None listed yet'
                : `${inCategory.length} ${inCategory.length === 1 ? 'place' : 'places'}`}
              {!feature && nearest?.km != null && <span> · {formatDistance(nearest.km)}</span>}
            </span>
            {feature && nearest && (
              <span className={styles.bentoNearest}>
                <span className={styles.bentoNearestName}>{nearest.item.name}</span>
                <span>{nearest.km != null ? `Nearest · ${formatDistance(nearest.km)} away` : 'Nearest listed'}</span>
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
