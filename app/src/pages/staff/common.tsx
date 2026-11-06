import type { ReactNode } from 'react'
import { RowsSkeleton } from '../../components/Skeleton.tsx'
import type { Snapshot } from '../../staff/snapshot.ts'
import page from '../Page.module.css'
import styles from './Staff.module.css'

// What a snapshot shows (John, 2026-11-06: "don't display it if it doesn't load"): placeholders
// while the first copy loads; one line with Try again if it never came, never an empty or broken
// list; the last copy, marked, when a refresh fails.
export function Loaded<T>({
  snap,
  what,
  rows = 3,
  children,
}: {
  snap: Snapshot<T>
  what: string
  rows?: number
  children: (data: T) => ReactNode
}) {
  if (snap.status === 'loading') return <RowsSkeleton count={rows} />
  if (snap.status === 'failed' || snap.data === undefined)
    return (
      <p className={styles.problem} role="status">
        Couldn't load {what}. The server may be waking up.
        <button type="button" onClick={snap.reload}>
          Try again
        </button>
      </p>
    )
  return (
    <>
      {snap.stale && (
        <p className={page.hint} role="status">
          Showing the last copy. It will refresh when the connection is back.
        </p>
      )}
      {children(snap.data)}
    </>
  )
}
