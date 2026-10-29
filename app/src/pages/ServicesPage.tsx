import { Search } from 'lucide-react'
import { useState } from 'react'
import AreaPicker from '../components/AreaPicker.tsx'
import { ServiceCard } from '../components/Cards.tsx'
import DataNotice from '../components/DataNotice.tsx'
import { CATEGORY_ICONS, ICON_STROKE } from '../components/icons.ts'
import { useAppData } from '../data/context.ts'
import { categoryLabel } from '../data/labels.ts'
import { filterServices } from '../rules/services.ts'
import { CATEGORIES, type Category } from '../types.ts'
import styles from './Page.module.css'

export default function ServicesPage() {
  const { data, area } = useAppData()
  const [picked, setCategory] = useState<Category | null>(null)
  const [query, setQuery] = useState('')

  const ready = data.status === 'ready'
  const all = ready ? data.services : []
  const labels = ready ? data.labels : null
  const areaNames = new Map(ready ? data.areas.map((a) => [a.id, a.name]) : [])
  // Only offer categories that have at least one place in the picked area.
  const inArea = filterServices(all, { area })
  const categories = CATEGORIES.filter((c) => inArea.some((s) => s.category === c))
  // A category picked in another area may not exist here; fall back to "All".
  const category = picked && categories.includes(picked) ? picked : null
  const shown = filterServices(all, { area, category, query })
  const where = area ? `in ${areaNames.get(area)}` : 'in all areas'

  return (
    <section className={styles.page} aria-labelledby="services-title">
      <div className={styles.intro}>
        <h1 id="services-title" className={styles.title}>
          Services
        </h1>
        <p className={styles.lead}>Tire repair, mechanics, hospitals, fuel and food along the road.</p>
      </div>

      <DataNotice hasSamples={shown.some((s) => s.sample)} />

      {ready && (
        <>
          <div className={styles.filters}>
            <AreaPicker />
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Search</span>
              <span className={styles.control}>
                <Search
                  className={`${styles.controlIcon} ${styles.leading}`}
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <input
                  className={`${styles.input} ${styles.withLead}`}
                  type="search"
                  enterKeyHint="search"
                  value={query}
                  placeholder="Name or landmark"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </span>
            </label>
          </div>

          <div className={styles.chips} role="group" aria-label="Category">
            {[null, ...categories].map((c) => {
              const Icon = c && CATEGORY_ICONS[c]
              return (
                <button
                  key={c ?? 'all'}
                  type="button"
                  className={styles.chip}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {Icon && <Icon size={17} strokeWidth={ICON_STROKE} aria-hidden="true" />}
                  {c ? categoryLabel(c, labels) : 'All'}
                </button>
              )
            })}
          </div>

          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              {shown.length} {shown.length === 1 ? 'place' : 'places'} {where}
            </h2>
          </div>

          {shown.length === 0 ? (
            <div className={`${styles.card} ${styles.empty}`}>
              <p>No places match. Try another area, category or word.</p>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => {
                  setQuery('')
                  setCategory(null)
                }}
              >
                Clear search and category
              </button>
            </div>
          ) : (
            <ul className={styles.list} aria-label="Places">
              {shown.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  labels={labels}
                  areaName={area === null ? areaNames.get(s.area) : undefined}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
