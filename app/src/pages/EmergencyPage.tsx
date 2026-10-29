import { ChevronLeft } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { ContactCard, HotlineCard, SectionHead } from '../components/Cards.tsx'
import DataNotice from '../components/DataNotice.tsx'
import { useAppData } from '../data/context.ts'
import { FALLBACK_EMERGENCY } from '../data/countries.ts'
import { countryName } from '../data/format.ts'
import { visibleContacts } from '../rules/emergency.ts'
import type { EmergencyContact } from '../types.ts'
import styles from './Page.module.css'

// Open to everyone, with or without an account. Reached from the red button on every screen;
// Back returns to wherever the person was.
export default function EmergencyPage() {
  const { country, data, area } = useAppData()
  const { account } = useAuth()
  const navigate = useNavigate()
  // 'default' means this is the first page of the visit (a shared link): there is nothing to go back to.
  const canGoBack = useLocation().key !== 'default'
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
      {canGoBack ? (
        <button type="button" className={styles.back} onClick={() => navigate(-1)}>
          <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
          Back
        </button>
      ) : (
        account && (
          <Link className={styles.back} to="/">
            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
            Home
          </Link>
        )
      )}
      <div className={styles.intro}>
        <h1 id="emergency-title" className={styles.title}>
          Emergency Help
        </h1>
        <p className={styles.lead}>
          {picked ? `Checked numbers for ${picked} and nationwide.` : 'Checked emergency numbers.'} No login
          needed.
        </p>
      </div>

      {hotlines.map((c) => (
        <HotlineCard key={c.id} contact={c} countryName={countryName(country)} />
      ))}

      <DataNotice hasSamples={local.some((c) => c.sample)} />

      {ready && (
        <div className={styles.section}>
          <SectionHead title="Local numbers">
            <p className={styles.count}>
              {local.length} {picked ? `in ${picked}` : 'in all areas'}
            </p>
          </SectionHead>
          {local.length === 0 ? (
            <p className={styles.card}>No checked local numbers here yet. The national hotline always works.</p>
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
        </div>
      )}

      {!account && (
        <p className={`${styles.notice} ${styles.guestNotice}`}>
          <span>You&apos;re using Bulig without an account. Nearby services and the map need one.</span>
          <Link className={styles.more} to="/login?next=%2F">
            Sign in
          </Link>
        </p>
      )}

      <p className={styles.footnote}>
        Bulig only shows numbers. It never calls for you, sends your location or dispatches help. Numbers
        not checked in the last 180 days are hidden.
      </p>
    </section>
  )
}
