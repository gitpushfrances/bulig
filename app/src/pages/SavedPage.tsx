import { Link } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { ContactCard, SectionHead, ServiceCard } from '../components/Cards.tsx'
import DataNotice from '../components/DataNotice.tsx'
import Mascot from '../components/Mascot.tsx'
import { useAppData } from '../data/context.ts'
import { useNearby } from '../data/useNearby.ts'
import { byDistance } from '../rules/nearby.ts'
import styles from './Page.module.css'

export default function SavedPage() {
  const { account, saved } = useAuth()
  const { data } = useAppData()
  const { position } = useNearby()

  const ready = data.status === 'ready'
  const areaNames = new Map(ready ? data.areas.map((a) => [a.id, a.name]) : [])
  // Places come nearest first when GPS is on. A saved record that was removed simply drops out.
  const places = byDistance(ready ? saved.flatMap((id) => data.services.filter((s) => s.id === id)) : [], position)
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
          <Link className={styles.primaryButton} to="/profile?next=/saved">
            Sign in
          </Link>
        </div>
      ) : (
        <>
          <DataNotice hasSamples={[...places.map((p) => p.item), ...numbers].some((r) => r.sample)} ropi />
          {ready && places.length + numbers.length === 0 && (
            <div className={`${styles.card} ${styles.empty} ${styles.emptyMascot}`}>
              <Mascot variant="friendly" />
              <p>Tap the heart on any place to save it here.</p>
              <Link className={styles.secondary} to="/services">
                Find a place
              </Link>
            </div>
          )}
          {places.length > 0 && (
            <>
              <SectionHead title="Places" />
              <ul className={styles.list} aria-label="Saved places">
                {places.map(({ item: s, km }) => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    km={km}
                    labels={ready ? data.labels : null}
                    areaName={areaNames.get(s.area)}
                  />
                ))}
              </ul>
            </>
          )}
          {numbers.length > 0 && (
            <>
              <SectionHead title="Numbers" />
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
