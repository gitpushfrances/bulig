import { useAppData } from '../data/context.ts'
import styles from '../pages/Page.module.css'
import Mascot from './Mascot.tsx'

interface Props {
  hasSamples: boolean
  // Show Ropi when offline with nothing cached. Off on Home and Emergency: never near getting help.
  ropi?: boolean
}

// Loading, error and sample-data notes, shared by every page that shows records.
// Being offline is shown once, in the header (Layout).
export default function DataNotice({ hasSamples, ropi = false }: Props) {
  const { data, retry, online } = useAppData()

  return (
    <>
      {data.status === 'loading' && (
        <p className={styles.notice} role="status">
          Loading…
        </p>
      )}
      {data.status === 'error' && ropi && !online && (
        <div className={`${styles.card} ${styles.empty} ${styles.emptyMascot}`} role="alert">
          <Mascot variant="thinking" />
          <p>No signal, and nothing saved here yet. Connect once and Bulig keeps this for offline use.</p>
          <button type="button" className={styles.secondary} onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {data.status === 'error' && !(ropi && !online) && (
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
