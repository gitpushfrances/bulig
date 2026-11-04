import { Link } from 'react-router'
import { Phone } from '@phosphor-icons/react'
import RopiSays from '../components/RopiSays.tsx'
import styles from './Page.module.css'

// A wrong link, an old shared link, or a place that is gone. Ropi `thinking`, no animation file:
// it costs nothing, works offline, and the red hazard button stays on screen (Layout).
// Emergency is linked by name because Home needs an account and Emergency never does.
export default function NotFoundPage() {
  return (
    <section className={styles.page} aria-labelledby="notfound-title">
      <div className={styles.intro}>
        <h1 id="notfound-title" className={styles.title}>
          Page not found
        </h1>
        <p className={styles.lead}>The link may be old, or the place was removed.</p>
      </div>
      <div className={`${styles.card} ${styles.empty} ${styles.emptyMascot}`}>
        <RopiSays variant="thinking">
          <strong>This road doesn&apos;t go anywhere.</strong> Let&apos;s get you back on track.
        </RopiSays>
        <Link className={styles.primaryButton} to="/">
          Go home
        </Link>
        <Link className={styles.secondary} to="/emergency">
          <Phone size={20} aria-hidden="true" />
          Emergency hotlines
        </Link>
      </div>
    </section>
  )
}
