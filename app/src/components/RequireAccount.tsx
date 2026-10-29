import { LogIn, Siren, UserPlus } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/context.ts'
import styles from '../pages/Page.module.css'
import RopiSays from './RopiSays.tsx'

// Everything except Emergency needs an account. A guest (who chose "Continue without an
// account") sees a friendly gate; anyone else goes to the login, and comes back after.
export default function RequireAccount() {
  const { account, guest } = useAuth()
  const { pathname, search } = useLocation()
  const here = pathname + search

  if (account) return <Outlet />
  if (!guest) return <Navigate to={here === '/' ? '/login' : `/login?next=${encodeURIComponent(here)}`} replace />

  const next = encodeURIComponent(here)
  return (
    <section className={`${styles.page} ${styles.gate}`} aria-labelledby="gate-title">
      <RopiSays variant="thinking" height={120}>
        This part needs a free account. <strong>Emergency numbers stay open to everyone.</strong>
      </RopiSays>
      <h1 id="gate-title" className={styles.title}>
        Sign in to see what&apos;s near you
      </h1>
      <p className={styles.lead}>Nearby services, the map and saved places come with an account.</p>
      <div className={styles.gateActions}>
        <Link className={styles.primaryButton} to={`/login?next=${next}`}>
          <LogIn size={18} strokeWidth={2} aria-hidden="true" />
          Sign in
        </Link>
        <Link className={styles.secondary} to={`/signup?next=${next}`}>
          <UserPlus size={18} strokeWidth={2} aria-hidden="true" />
          Create an account
        </Link>
        <Link className={styles.secondary} to="/emergency">
          <Siren size={18} strokeWidth={2} aria-hidden="true" />
          Emergency numbers
        </Link>
      </div>
    </section>
  )
}
