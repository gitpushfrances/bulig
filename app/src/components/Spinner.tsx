import type { ReactNode } from 'react'
import styles from './Spinner.module.css'

// A small spinning ring for a button that is waiting on the server.
export default function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />
}

// What goes inside a submit button. While `busy`, the ring replaces the icon and text, and the
// hidden label keeps the button exactly as wide as before (nothing jumps). Screen readers hear
// `busyLabel` ("Signing in…") instead. Give the button aria-busy and disabled too.
export function BusyContent({ busy, busyLabel, children }: { busy: boolean; busyLabel: string; children: ReactNode }) {
  return (
    <span className={styles.stack}>
      <span className={busy ? `${styles.label} ${styles.hidden}` : styles.label} aria-hidden={busy || undefined}>
        {children}
      </span>
      {busy && (
        <span className={styles.label} role="status">
          <Spinner />
          <span className="visually-hidden">{busyLabel}</span>
        </span>
      )}
    </span>
  )
}
