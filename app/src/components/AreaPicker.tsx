import { ChevronDown, MapPin } from 'lucide-react'
import { useAppData } from '../data/context.ts'
import type { Area } from '../types.ts'
import styles from '../pages/Page.module.css'

// Areas grouped under their region, regions in alphabetical order.
function byRegion(areas: Area[]): [string, Area[]][] {
  const groups = new Map<string, Area[]>()
  for (const a of [...areas].sort((x, y) => x.name.localeCompare(y.name))) {
    groups.set(a.region, [...(groups.get(a.region) ?? []), a])
  }
  return [...groups].sort(([x], [y]) => x.localeCompare(y))
}

// Native select: big, familiar and accessible on every phone.
export default function AreaPicker() {
  const { data, area, setArea } = useAppData()
  if (data.status !== 'ready' || data.areas.length === 0) return null

  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>Area</span>
      <span className={styles.control}>
        <MapPin className={`${styles.controlIcon} ${styles.leading}`} size={18} strokeWidth={2} aria-hidden="true" />
        <select
          className={`${styles.input} ${styles.withLead} ${styles.withTrail}`}
          value={area ?? ''}
          onChange={(e) => setArea(e.target.value || null)}
        >
          <option value="">All areas</option>
          {byRegion(data.areas).map(([region, areas]) => (
            <optgroup key={region} label={region}>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}, {a.region}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown
          className={`${styles.controlIcon} ${styles.trailing}`}
          size={18}
          strokeWidth={2}
          aria-hidden="true"
        />
      </span>
    </label>
  )
}
