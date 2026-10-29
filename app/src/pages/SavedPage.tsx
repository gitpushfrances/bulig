import { Link } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { ContactCard, ServiceCard } from '../components/Cards.tsx'
import DataNotice from '../components/DataNotice.tsx'
import { useAppData } from '../data/context.ts'
import styles from './Page.module.css'

export default function SavedPage() {
  const { account, saved } = useAuth()
  const { data } = useAppData()

  const ready = data.status === 'ready'
  const areaNames = new Map(ready ? data.areas.map((a) => [a.id, a.name]) : [])
  // Records keep the order they were saved in. A saved record that was removed simply drops out.
  const places = ready ? saved.flatMap((id) => data.services.filter((s) => s.id === id)) : []
  const numbers = ready ? saved.flatMap((id) => data.emergency.filter((c) => c.id === id)) : []

  return (
    <section className={styles.page} aria-labelledby="saved-title">
      <div className={styles.intro}>
        <h1 id="saved-title" className={styles.title}>
          Saved
        </h1>
        <p className={styles.lead}>Places and numbers you keep coming back to, on this phone.</p>
      </div>

      {!account ? (
        <div className={`${styles.card} ${styles.empty}`}>
          <p>Sign in to save places and numbers, so they're here when you need them again.</p>
          <Link className={styles.primaryButton} to="/account?next=/saved">
            Sign in
          </Link>
        </div>
      ) : (
        <>
          <DataNotice hasSamples={[...places, ...numbers].some((r) => r.sample)} />
          {ready && places.length + numbers.length === 0 && (
            <div className={`${styles.card} ${styles.empty}`}>
              <p>Nothing saved yet. Tap the bookmark on a place or a local number to keep it here.</p>
              <Link className={styles.secondary} to="/services">
                Find a place
              </Link>
            </div>
          )}
          {places.length > 0 && (
            <>
              <h2 className={styles.sectionTitle}>Places</h2>
              <ul className={styles.list} aria-label="Saved places">
                {places.map((s) => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    labels={ready ? data.labels : null}
                    areaName={areaNames.get(s.area)}
                  />
                ))}
              </ul>
            </>
          )}
          {numbers.length > 0 && (
            <>
              <h2 className={styles.sectionTitle}>Numbers</h2>
              <ul className={styles.list} aria-label="Saved numbers">
                {numbers.map((c) => (
                  <ContactCard key={c.id} contact={c} areaName={c.area ? areaNames.get(c.area) : undefined} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  )
}
