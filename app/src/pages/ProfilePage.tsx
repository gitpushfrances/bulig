import { ChevronRight, LogOut } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { safeNext } from '../auth/next.ts'
import { ROLE_LABELS, type Role } from '../auth/types.ts'
import AuthPanel from '../components/AuthPanel.tsx'
import Mascot from '../components/Mascot.tsx'
import styles from './Page.module.css'

const ROLE_HELP: Record<Role, string> = {
  user: 'You can save places and numbers.',
  moderator: 'You check and update records for the areas you look after.',
  admin: 'You manage areas, moderators and every record.',
}

export default function ProfilePage() {
  const { account, signOut, saved } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = safeNext(params.get('next'))

  return (
    <section className={`${styles.page} ${styles.narrow}`} aria-labelledby="profile-title">
      <div className={styles.intro}>
        <h1 id="profile-title" className={styles.title}>
          Profile
        </h1>
        <p className={styles.lead}>
          Sign in to save places and numbers. Emergency Help always works without an account.
        </p>
      </div>

      {account ? (
        <div className={`${styles.card} ${styles.form}`}>
          <div className={styles.profileHead}>
            <Mascot variant="head" height={56} />
            <div className={styles.profile}>
              <h2 className={styles.sectionTitle}>{account.name}</h2>
              <p className={styles.count}>{account.email}</p>
            </div>
          </div>
          <p>
            <strong>Role: {ROLE_LABELS[account.role]}.</strong> {ROLE_HELP[account.role]}
          </p>
          <Link className={styles.secondary} to="/saved">
            Saved ({saved.length})
          </Link>
          <button type="button" className={styles.secondary} onClick={signOut}>
            <LogOut size={18} strokeWidth={2} aria-hidden="true" />
            Sign out
          </button>
        </div>
      ) : (
        <AuthPanel onDone={() => next && navigate(next)} />
      )}

      <p className={styles.footnote}>
        Your exact location stays on this phone: it finds your area and sorts places by distance. To
        show your barangay and ZIP code, Bulig sends a rounded location (about 100 m) to OpenStreetMap,
        only when you're online and after you move or tap refresh. Nothing else is shared.
      </p>

      <ul className={`${styles.card} ${styles.linkList}`}>
        <li>
          <Link to="/about">
            About Bulig
            <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
          </Link>
        </li>
      </ul>
    </section>
  )
}
