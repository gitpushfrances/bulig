import AreaPicker from '../components/AreaPicker.tsx'
import DataNotice from '../components/DataNotice.tsx'
import { useAppData } from '../data/context.ts'
import { FALLBACK_EMERGENCY } from '../data/countries.ts'
import { formatDate, telHref } from '../data/format.ts'
import { kindLabel } from '../data/labels.ts'
import { visibleContacts } from '../rules/emergency.ts'
import type { Area, EmergencyContact } from '../types.ts'
import styles from './Page.module.css'

function ContactCard({ contact, areaName }: { contact: EmergencyContact; areaName?: string }) {
  const national = contact.kind === 'national'
  return (
    <li className={`${styles.card} ${national ? styles.national : ''}`}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{contact.name}</h2>
        {contact.sample && <span className={styles.sample}>SAMPLE</span>}
      </div>
      <p className={styles.meta}>
        {kindLabel(contact.kind)}
        {areaName && ` · ${areaName}`}
      </p>
      <div className={styles.actions}>
        {contact.phones.map((phone, i) => (
          <a
            key={phone}
            className={i === 0 ? styles.call : styles.secondary}
            href={telHref(phone)}
            aria-label={`Call ${contact.name} at ${phone}`}
          >
            Call {phone}
          </a>
        ))}
      </div>
      {contact.verifiedAt && <p className={styles.checked}>Last checked {formatDate(contact.verifiedAt)}</p>}
    </li>
  )
}

export default function EmergencyPage() {
  const { country, data, area } = useAppData()
  const fallback = FALLBACK_EMERGENCY[country]

  let contacts: EmergencyContact[] = []
  let areaNames = new Map<string, string>()
  if (data.status === 'ready') {
    contacts = visibleContacts(data.emergency, area, new Date())
    areaNames = new Map(data.areas.map((a: Area) => [a.id, a.name]))
  }

  return (
    <section className={styles.page} aria-labelledby="emergency-title">
      <h1 id="emergency-title" className={styles.title}>
        Emergency Help
      </h1>
      <p className={styles.lead}>Checked emergency numbers for where you are. No login needed.</p>

      <DataNotice hasSamples={contacts.some((c) => c.sample)} />

      {/* Until data loads (or if it never does), the national number is still one tap away. */}
      {data.status !== 'ready' && fallback && (
        <ul className={styles.list}>
          <ContactCard
            contact={{
              id: 'fallback',
              country,
              area: null,
              name: 'National Emergency Hotline',
              kind: 'national',
              phones: [fallback],
              verifiedAt: '',
              source: 'built-in fallback',
            }}
          />
        </ul>
      )}

      <AreaPicker />

      {data.status === 'ready' && (
        <ul className={styles.list} aria-label="Emergency numbers">
          {contacts.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              areaName={area === null && c.area ? areaNames.get(c.area) : undefined}
            />
          ))}
        </ul>
      )}

      <p className={styles.footnote}>
        Bulig only shows numbers. It never calls for you, sends your location or dispatches help.
        Numbers not checked in the last 180 days are hidden.
      </p>
    </section>
  )
}
