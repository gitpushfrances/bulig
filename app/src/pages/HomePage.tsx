import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { HotlineCard, NumberRow, OfferCard, PlaceRow, SectionHead } from '../components/Cards.tsx'
import AddressCard from '../components/AddressCard.tsx'
import DataNotice from '../components/DataNotice.tsx'
import { useAppData } from '../data/context.ts'
import { FALLBACK_EMERGENCY } from '../data/countries.ts'
import { countryName } from '../data/format.ts'
import { useNearby } from '../data/useNearby.ts'
import { visibleContacts } from '../rules/emergency.ts'
import { NEAR_KM, formatDistance } from '../rules/nearby.ts'
import { CATEGORIES, type EmergencyContact } from '../types.ts'
import styles from './Page.module.css'

// The categories shown on Home, in the order a driver needs them.
const HOME_OFFERS = CATEGORIES.slice(0, 6)

export default function HomePage() {
  const { country, data, area, areaKm } = useAppData()
  const { account, saved } = useAuth()
  const { ready, areaName, where, ranked, labels } = useNearby()

  const contacts = data.status === 'ready' ? visibleContacts(data.emergency, area, new Date()) : []
  const national = contacts.find((c) => c.kind === 'national' && c.area === null)
  const localAll = contacts.filter((c) => c !== national)
  const local = localAll.slice(0, 3)
  const fallback = FALLBACK_EMERGENCY[country]
  const hotline: EmergencyContact | undefined =
    national ??
    (fallback && !ready
      ? {
          id: 'fallback',
          country,
          area: null,
          name: 'National emergency hotline',
          kind: 'national',
          phones: [fallback],
          verifiedAt: '',
          source: 'built-in fallback',
        }
      : undefined)

  const nearest = ranked.slice(0, 3)
  const savedPlaces =
    data.status === 'ready' ? saved.flatMap((id) => data.services.filter((s) => s.id === id)).slice(0, 3) : []

  return (
    <section className={styles.page} aria-labelledby="home-title">
      <div className={styles.intro}>
        <h1 id="home-title" className={styles.title}>
          {areaKm !== null ? 'Help near you' : areaName ? `Help near ${areaName}` : 'Help along the way'}
        </h1>
        <p className={styles.lead}>
          {ready && areaName && areaKm !== null && areaKm > NEAR_KM
            ? `The nearest listed area is ${areaName}, ${formatDistance(areaKm)} away: ${ranked.length} places and ${localAll.length} local numbers there.`
            : ready
            ? `${ranked.length} ${ranked.length === 1 ? 'place' : 'places'} and ${localAll.length} local ${localAll.length === 1 ? 'number' : 'numbers'} ${where}.`
            : 'Checked numbers and road services, even offline.'}
        </p>
      </div>

      <AddressCard />

      <DataNotice hasSamples={ranked.some((r) => r.item.sample)} />

      <div className={styles.homeGrid}>
        <div className={styles.homeColumn}>
          <div className={styles.section}>
            {hotline && <HotlineCard contact={hotline} countryName={countryName(country)} compact />}
            {local.length > 0 && (
              <div className={styles.panel}>
                <ul className={styles.rows} aria-label="Local emergency numbers">
                  {local.map((c) => (
                    <NumberRow key={c.id} contact={c} />
                  ))}
                </ul>
              </div>
            )}
            <Link className={`${styles.more} ${styles.moreEnd}`} to="/emergency">
              All emergency numbers
              <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>

          {ready && (
            <div className={styles.section}>
              <SectionHead title="Nearest to you" to="/services" more="All services" />
              <div className={styles.panel}>
                {nearest.length ? (
                  <ul className={styles.rows} aria-label="Nearest places">
                    {nearest.map(({ item, km }) => (
                      <PlaceRow key={item.id} service={item} labels={labels} km={km} />
                    ))}
                  </ul>
                ) : (
                  <p className={styles.panelEmpty}>No places listed here yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.homeColumn}>
          {ready && (
            <div className={styles.section}>
              <SectionHead title="What we offer" to="/services" />
              <div className={styles.offerGrid}>
                {HOME_OFFERS.map((c) => {
                  const inCategory = ranked.filter((r) => r.item.category === c)
                  return (
                    <OfferCard
                      key={c}
                      category={c}
                      labels={labels}
                      count={inCategory.length}
                      nearestKm={inCategory[0]?.km ?? null}
                      compact
                    />
                  )
                })}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <SectionHead title="Saved" to={account ? '/saved' : undefined} />
            <div className={styles.panel}>
              {!account ? (
                <div className={styles.panelEmpty}>
                  <p>Sign in to keep the places you trust one tap away.</p>
                  <Link className={styles.secondary} to="/profile?next=/">
                    Sign in
                  </Link>
                </div>
              ) : savedPlaces.length ? (
                <ul className={styles.rows} aria-label="Saved places">
                  {savedPlaces.map((s) => (
                    <PlaceRow key={s.id} service={s} labels={labels} km={ranked.find((r) => r.item.id === s.id)?.km ?? null} />
                  ))}
                </ul>
              ) : (
                <p className={styles.panelEmpty}>Tap the heart on any place to keep it here.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className={styles.footnote}>Pull over safely before using your phone.</p>
    </section>
  )
}
