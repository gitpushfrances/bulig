import type { ReactNode } from 'react'
import Mascot, { type MascotVariant } from './Mascot.tsx'
import styles from './RopiSays.module.css'

// Ropi with a speech bubble. Ropi stays decorative; the bubble is real text that screen readers
// read like any paragraph. Only on the quiet screens UI-UX.md allows (never Home or Emergency).
export default function RopiSays({
  variant,
  children,
  height = 120,
  side = false,
}: {
  variant: MascotVariant
  children: ReactNode
  height?: number
  // Bubble to the right of Ropi (wide screens, onboarding) instead of above.
  side?: boolean
}) {
  return (
    <div className={`${styles.says} ${side ? styles.side : ''}`}>
      <div className={styles.bubble}>{children}</div>
      <Mascot variant={variant} height={height} />
    </div>
  )
}
