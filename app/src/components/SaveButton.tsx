import { Heart } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/context.ts'
import styles from '../pages/Page.module.css'

// Saving needs the test sign-in. Signed out, the same spot links to Profile and comes back here.
export default function SaveButton({ id, name }: { id: string; name: string }) {
  const { account, saved, toggleSaved } = useAuth()
  const { pathname } = useLocation()

  if (!account) {
    return (
      <Link
        className={styles.save}
        to={`/profile?next=${encodeURIComponent(pathname)}`}
        aria-label={`Sign in to save ${name}`}
      >
        <Heart size={22} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    )
  }

  const on = saved.includes(id)
  return (
    <button
      type="button"
      className={styles.save}
      aria-pressed={on}
      aria-label={`Save ${name}`}
      onClick={() => toggleSaved(id)}
    >
      <Heart size={22} strokeWidth={1.75} fill={on ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}
