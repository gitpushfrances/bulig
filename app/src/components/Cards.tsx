import { CircleCheck, Clock, MapPin, Navigation, Phone } from 'lucide-react'
import { directionsHref, formatDate, telHref } from '../data/format.ts'
import { categoryLabel, kindLabel } from '../data/labels.ts'
import type { EmergencyContact, Labels, Service } from '../types.ts'
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

// The country's national line: the biggest thing on Emergency Help, never hidden.
export function HotlineCard({ contact, countryName }: { contact: EmergencyContact; countryName: string }) {
  const titleId = `${contact.id}-title`
  return (
    <section className={styles.hotline} aria-labelledby={titleId}>
      <div className={styles.hotlineHead}>
        <h2 id={titleId} className={styles.hotlineName}>
          <KIND_ICONS.national size={18} strokeWidth={2} aria-hidden="true" />
          {contact.name}
        </h2>
        <span>{countryName}</span>
      </div>
      <p className={styles.hotlineNumber}>{contact.phones[0]}</p>
      <div className={styles.actions}>
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
      {contact.verifiedAt && <Checked date={contact.verifiedAt} />}
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
            <Icon size={17} strokeWidth={ICON_STROKE} aria-hidden="true" />
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
}: {
  service: Service
  labels: Labels | null
  areaName?: string
}) {
  const Icon = CATEGORY_ICONS[service.category]
  const hasMap = service.lat !== undefined && service.lng !== undefined
  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardHeading}>
          <h3 className={styles.cardTitle}>{service.name}</h3>
          <p className={styles.meta}>
            <Icon size={17} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {categoryLabel(service.category, labels)} · {service.landmark}
          </p>
        </div>
        {service.sample && <Sample />}
        <SaveButton id={service.id} name={service.name} />
      </div>
      {(service.hours || areaName) && (
        <div className={styles.details}>
          {service.hours && (
            <p className={styles.detail}>
              <Clock size={15} strokeWidth={2} aria-hidden="true" />
              Open {service.hours}
            </p>
          )}
          {areaName && (
            <p className={styles.detail}>
              <MapPin size={15} strokeWidth={2} aria-hidden="true" />
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
