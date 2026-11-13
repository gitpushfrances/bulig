import { Link } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { ContactCard, SectionHead, ServiceCard } from '../components/Cards.tsx'
import DataNotice from '../components/DataNotice.tsx'
import RopiSays from '../components/RopiSays.tsx'
import { CardListSkeleton } from '../components/Skeleton.tsx'
import { useAppData, usePlaceIds } from '../data/context.ts'
import { useNearby } from '../data/useNearby.ts'
import { byDistance } from '../rules/nearby.ts'
import { transitionName } from '../motion.ts'
import styles from './Page.module.css'

export default function SavedPage() {
  const { account, saved, savedStatus, retrySaved } = useAuth()
  const { data, fromBackup, retry, missingPlaces, loadingPlaces } = useAppData()
  const { position } = useNearby()

  const ready = data.status === 'ready'
  const areaNames = new Map(ready ? data.areas.map((a) => [a.id, a.name]) : [])
  const numbers = ready ? saved.flatMap((id) => data.emergency.filter((c) => c.id === id)) : []
  // Saved places load by ID, wherever they are in the country.
  const placeIds = ready ? saved.filter((id) => !numbers.some((c) => c.id === id)) : []
  usePlaceIds(placeIds)
  // Places come nearest first when GPS is on. A saved record that was removed simply drops out.
  const places = byDistance(ready ? placeIds.flatMap((id) => data.services.filter((s) => s.id === id)) : [], position)
  // Hearts whose places haven't arrived: still on their way, or the server is asleep and the app is
  // showing its bundled files. They are not gone: never show "nothing saved" for them.
  const unresolved = placeIds.filter((id) => !missingPlaces.has(id) && !places.some((p) => p.item.id === id)).length
  const waitingForServer = ready && !!fromBackup && !loadingPlaces && unresolved > 0
  const listLoading = data.status === 'loading' || savedStatus === 'loading' || (loadingPlaces && unresolved > 0)
  const empty = ready && !listLoading && !waitingForServer && savedStatus !== 'error' && places.length + numbers.length === 0

  return (
    <section className={styles.page} aria-labelledby="saved-title">
      <div className={styles.intro}>
        <h1 id="saved-title" className={styles.title}>
          Saved
        </h1>
        <p className={styles.lead}>Places and numbers you keep coming back to.</p>
      </div>

      {!account ? (
        <div className={`${styles.card} ${styles.empty}`}>
          <p>Sign in to save places and numbers, so they're here when you need them again.</p>
          <Link className={styles.primaryButton} to="/login?next=%2Fsaved">
            Sign in
          </Link>
        </div>
      ) : (
        <>
          <DataNotice ropi />
          {savedStatus === 'error' && (
            <div className={styles.notice} role="alert">
              <p>Couldn&apos;t load your saved places. Bulig keeps trying; check your signal.</p>
              <button type="button" className={styles.secondary} onClick={retrySaved}>
                Try again
              </button>
            </div>
          )}
          {waitingForServer && savedStatus !== 'error' && (
            <div className={styles.notice} role="status">
              <p>
                {unresolved === 1 ? 'One saved place' : 'Some saved places'} will show
                once Bulig reaches the server.
              </p>
              <button type="button" className={styles.secondary} onClick={retry}>
                Try again
              </button>
            </div>
          )}
          {savedStatus === 'stale' && (
            <p className={styles.notice} role="status">
              Showing the saved places on this phone. Bulig will update them when it reaches the server.
            </p>
          )}
          {listLoading && savedStatus !== 'error' && (
            <CardListSkeleton count={Math.min(Math.max(saved.length, 1), 4)} ropi />
          )}
          {empty && (
            <div className={`${styles.card} ${styles.empty} ${styles.emptyMascot}`}>
              <RopiSays variant="friendly">
                <strong>Let&apos;s get started!</strong> Tap the heart on any place to save it here.
              </RopiSays>
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
                    transition={transitionName('saved-place', s.id)}
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
                  <ContactCard
                    key={c.id}
                    contact={c}
                    areaName={c.area ? areaNames.get(c.area) : undefined}
                    transition={transitionName('saved-number', c.id)}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  )
}
