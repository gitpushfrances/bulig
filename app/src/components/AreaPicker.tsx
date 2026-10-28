import { useAppData } from '../data/context.ts'
import styles from '../pages/Page.module.css'

// Native select: big, familiar and accessible on every phone.
export default function AreaPicker() {
  const { data, area, setArea } = useAppData()
  if (data.status !== 'ready' || data.areas.length === 0) return null

  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>Area</span>
      <select
        className={styles.input}
        value={area ?? ''}
        onChange={(e) => setArea(e.target.value || null)}
      >
        <option value="">All areas</option>
        {data.areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}, {a.region}
          </option>
        ))}
      </select>
    </label>
  )
}
