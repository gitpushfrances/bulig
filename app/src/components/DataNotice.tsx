import { useAppData } from '../data/context.ts'
import styles from '../pages/Page.module.css'

// Loading, error and sample-data notes, shared by every page that shows records.
// Being offline is shown once, in the header (Layout).
export default function DataNotice({ hasSamples }: { hasSamples: boolean }) {
  const { data, retry } = useAppData()

  return (
    <>
      {data.status === 'loading' && (
        <p className={styles.notice} role="status">
          Loading…
        </p>
      )}
      {data.status === 'error' && (
        <div className={`${styles.notice} ${styles.warn}`} role="alert">
          <p>Couldn&apos;t load data. Check your connection and try again.</p>
          <button type="button" className={styles.secondary} onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {hasSamples && (
        <p className={`${styles.notice} ${styles.warn}`}>
          <span>
            <strong>Sample data.</strong> Places and local numbers marked SAMPLE are made up for testing.
            Don&apos;t call them.
          </span>
        </p>
      )}
    </>
  )
}
