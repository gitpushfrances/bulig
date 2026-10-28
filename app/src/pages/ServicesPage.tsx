import { useState } from 'react'
import AreaPicker from '../components/AreaPicker.tsx'
import DataNotice from '../components/DataNotice.tsx'
import { useAppData } from '../data/context.ts'
import { directionsHref, formatDate, telHref } from '../data/format.ts'
import { categoryLabel } from '../data/labels.ts'
import { filterServices } from '../rules/services.ts'
import { CATEGORIES, type Category, type Labels, type Service } from '../types.ts'
import styles from './Page.module.css'

function ServiceCard({ service, labels }: { service: Service; labels: Labels | null }) {
  const hasMap = service.lat !== undefined && service.lng !== undefined
  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{service.name}</h2>
        {service.sample && <span className={styles.sample}>SAMPLE</span>}
      </div>
      <p className={styles.meta}>
        {categoryLabel(service.category, labels)} · {service.landmark}
      </p>
      {service.hours && <p className={styles.meta}>Open: {service.hours}</p>}
      {(service.phone || hasMap) && (
        <div className={styles.actions}>
          {service.phone && (
            <a className={styles.call} href={telHref(service.phone)} aria-label={`Call ${service.name}`}>
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
              Directions
            </a>
          )}
        </div>
      )}
      <p className={styles.checked}>Last checked {formatDate(service.verifiedAt)}</p>
    </li>
  )
}

export default function ServicesPage() {
  const { data, area } = useAppData()
  const [picked, setCategory] = useState<Category | null>(null)
  const [query, setQuery] = useState('')

  const ready = data.status === 'ready'
  const all = ready ? data.services : []
  const labels = ready ? data.labels : null
  // Only offer categories that have at least one place in the picked area.
  const inArea = filterServices(all, { area })
  const categories = CATEGORIES.filter((c) => inArea.some((s) => s.category === c))
  // A category picked in another area may not exist here; fall back to "All".
  const category = picked && categories.includes(picked) ? picked : null
  const shown = filterServices(all, { area, category, query })

  return (
    <section className={styles.page} aria-labelledby="services-title">
      <h1 id="services-title" className={styles.title}>
        Services
      </h1>
      <p className={styles.lead}>
        Tire repair, mechanics, hospitals, fuel and places to eat along the road.
      </p>

      <DataNotice hasSamples={shown.some((s) => s.sample)} />

      {ready && (
        <>
          <AreaPicker />
          <div className={styles.chips} role="group" aria-label="Category">
            {[null, ...categories].map((c) => (
              <button
                key={c ?? 'all'}
                type="button"
                className={styles.chip}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c ? categoryLabel(c, labels) : 'All'}
              </button>
            ))}
          </div>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Search</span>
            <input
              className={styles.input}
              type="search"
              value={query}
              placeholder="Name or landmark"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          {shown.length === 0 ? (
            <p className={styles.card}>No places match. Try another area or category.</p>
          ) : (
            <ul className={styles.list} aria-label="Places">
              {shown.map((s) => (
                <ServiceCard key={s.id} service={s} labels={labels} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
