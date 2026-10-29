import AreaPicker from '../components/AreaPicker.tsx'
import { ContactCard, HotlineCard } from '../components/Cards.tsx'
import DataNotice from '../components/DataNotice.tsx'
import { useAppData } from '../data/context.ts'
import { FALLBACK_EMERGENCY } from '../data/countries.ts'
import { countryName } from '../data/format.ts'
import { visibleContacts } from '../rules/emergency.ts'
import type { EmergencyContact } from '../types.ts'
import styles from './Page.module.css'

export default function EmergencyPage() {
  const { country, data, area } = useAppData()
  const fallback = FALLBACK_EMERGENCY[country]
  const ready = data.status === 'ready'

  const contacts = ready ? visibleContacts(data.emergency, area, new Date()) : []
  const national = contacts.filter((c) => c.kind === 'national' && c.area === null)
  const local = contacts.filter((c) => !national.includes(c))
  const areaNames = new Map(ready ? data.areas.map((a) => [a.id, a.name]) : [])
  const picked = area ? areaNames.get(area) : undefined

  // Until data loads (or if it never does), the national number is still one tap away.
  const hotlines: EmergencyContact[] =
    ready || !fallback
      ? national
      : [
          {
            id: 'fallback',
            country,
            area: null,
            name: 'National emergency hotline',
            kind: 'national',
            phones: [fallback],
            verifiedAt: '',
            source: 'built-in fallback',
          },
        ]

  return (
    <section className={styles.page} aria-labelledby="emergency-title">
      <div className={styles.intro}>
        <h1 id="emergency-title" className={styles.title}>
          Emergency Help
        </h1>
        <p className={styles.lead}>Checked emergency numbers for where you are. No login needed.</p>
      </div>

      {hotlines.map((c) => (
        <HotlineCard key={c.id} contact={c} countryName={countryName(country)} />
      ))}

      <DataNotice hasSamples={local.some((c) => c.sample)} />

      {ready && (
        <>
          <AreaPicker />
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Local numbers</h2>
            <p className={styles.count}>
              {local.length} {local.length === 1 ? 'number' : 'numbers'} {picked ? `in ${picked}` : 'in all areas'}
            </p>
          </div>
          {local.length === 0 ? (
            <p className={styles.card}>
              No checked local numbers here yet. The national hotline above always works.
            </p>
          ) : (
            <ul className={styles.list} aria-label="Local emergency numbers">
              {local.map((c) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  areaName={area === null && c.area ? areaNames.get(c.area) : undefined}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <p className={styles.footnote}>
        Bulig only shows numbers. It never calls for you, sends your location or dispatches help.
        Numbers not checked in the last 180 days are hidden.
      </p>
    </section>
  )
}
