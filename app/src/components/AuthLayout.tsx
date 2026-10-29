import type { ReactNode } from 'react'
import Mascot from './Mascot.tsx'
import styles from './AuthLayout.module.css'

// Sign in, Create account and Forgot password. No tab bar, no header chrome.
// Phones: Ropi's head in a circle tops the form, like an app icon. Wide screens: the form on the
// right, and a quiet panel on the left with Ropi waving (tap Ropi to say hi).
// Screens where Ropi is already talking (onboarding) turn the panel off: one Ropi per screen.
export default function AuthLayout({
  children,
  wide = false,
  panel = true,
}: {
  children: ReactNode
  wide?: boolean
  panel?: boolean
}) {
  return (
    <div className={`${styles.screen} ${panel ? '' : styles.single}`}>
      {panel && (
        <aside className={styles.aside} aria-hidden="true">
          <div className={styles.asideInner}>
            <Mascot variant="ready" height={260} />
            <p className={styles.brand}>Bulig</p>
            <p className={styles.tagline}>Help along the way.</p>
          </div>
        </aside>
      )}
      <main className={`${styles.main} ${wide ? styles.mainWide : ''}`}>
        <div className={styles.column}>{children}</div>
      </main>
    </div>
  )
}

// Ropi's head as the app mark on phones. Hidden where the side panel shows Ropi already.
export function AuthMark() {
  return (
    <div className={styles.mark}>
      <Mascot variant="head" height={88} />
    </div>
  )
}
