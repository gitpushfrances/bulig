import { useAppData } from '../data/context.ts'
import styles from '../pages/Page.module.css'
import RopiSays from './RopiSays.tsx'

interface Props {
  // Ropi explains when offline with nothing cached. Off on Home and Emergency: never near
  // getting help.
  ropi?: boolean
}

// Load errors, shared by every page that shows records. (The "Sample data" banner was removed on
// 2026-11-04, John: real data is coming; sample rows still carry their own SAMPLE badge.) Loading is each page's
// own skeleton (Skeleton.tsx); being offline is shown once, at the top (Layout).
export default function DataNotice({ ropi = false }: Props) {
  const { data, retry, online } = useAppData()
  const failed = data.status === 'error'

  return (
    <>
      {failed && ropi && !online && (
        <div className={`${styles.card} ${styles.empty} ${styles.emptyMascot}`} role="alert">
          <RopiSays variant="thinking">
            <strong>No signal, and nothing saved here yet.</strong> Connect once and Bulig keeps this for offline
            use.
          </RopiSays>
          <button type="button" className={styles.secondary} onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {failed && !(ropi && !online) && (
        <div className={`${styles.notice} ${styles.warn}`} role="alert">
          <p>Couldn&apos;t load data. Check your connection and try again.</p>
          <button type="button" className={styles.secondary} onClick={retry}>
            Try again
          </button>
        </div>
      )}
    </>
  )
}
