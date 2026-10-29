import { OfferCard } from '../components/Cards.tsx'
import DataNotice from '../components/DataNotice.tsx'
import { useNearby } from '../data/useNearby.ts'
import { CATEGORIES } from '../types.ts'
import styles from './Page.module.css'

// What we offer: one card per kind of service. A card opens its list, so the card is the filter.
export default function ServicesPage() {
  const { ready, where, ranked, labels, position } = useNearby()

  return (
    <section className={styles.page} aria-labelledby="services-title">
      <div className={styles.intro}>
        <h1 id="services-title" className={styles.title}>
          What we offer
        </h1>
        <p className={styles.lead}>
          {ready
            ? `${ranked.length} ${ranked.length === 1 ? 'place' : 'places'} ${where}${position ? ', nearest first' : ''}. Pick what you need.`
            : 'Places along the road, grouped by what they do.'}
        </p>
      </div>

      <DataNotice hasSamples={ranked.some((r) => r.item.sample)} ropi />

      {ready && (
        <nav className={styles.offerGrid} aria-label="Services">
          {CATEGORIES.map((c) => {
            const inCategory = ranked.filter((r) => r.item.category === c)
            return (
              <OfferCard
                key={c}
                category={c}
                labels={labels}
                count={inCategory.length}
                nearestKm={inCategory[0]?.km ?? null}
              />
            )
          })}
        </nav>
      )}
    </section>
  )
}
