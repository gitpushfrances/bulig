import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ServiceCard } from '../components/Cards.tsx'
import DataNotice from '../components/DataNotice.tsx'
import { categoryBlurb, categoryFromSlug, categoryLabel } from '../data/labels.ts'
import { useNearby } from '../data/useNearby.ts'
import NotFoundPage from './NotFoundPage.tsx'
import styles from './Page.module.css'

// Every place of one kind in the current area, nearest first.
export default function CategoryPage() {
  const category = categoryFromSlug(useParams().category)
  const { ready, area, areaNames, where, ranked, labels, position } = useNearby()
  if (!category) return <NotFoundPage />

  const label = categoryLabel(category, labels)
  const places = ranked.filter((r) => r.item.category === category)

  return (
    <section className={styles.page} aria-labelledby="category-title">
      <Link className={styles.back} to="/services">
        <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        What we offer
      </Link>
      <div className={styles.intro}>
        <h1 id="category-title" className={styles.title}>
          {label}
        </h1>
        <p className={styles.lead}>
          {ready
            ? `${places.length} ${places.length === 1 ? 'place' : 'places'} ${where}${position && places.length > 1 ? ', nearest first' : ''}.`
            : categoryBlurb(category)}
        </p>
      </div>

      <DataNotice hasSamples={places.some((r) => r.item.sample)} />

      {ready &&
        (places.length === 0 ? (
          <div className={`${styles.card} ${styles.empty}`}>
            <p>No {label.toLowerCase()} listed {where} yet.</p>
            <Link className={styles.secondary} to="/services">
              See other services
            </Link>
          </div>
        ) : (
          <ul className={styles.list} aria-label="Places">
            {places.map(({ item, km }) => (
              <ServiceCard
                key={item.id}
                service={item}
                labels={labels}
                km={km}
                areaName={area === null ? areaNames.get(item.area) : undefined}
              />
            ))}
          </ul>
        ))}
    </section>
  )
}
