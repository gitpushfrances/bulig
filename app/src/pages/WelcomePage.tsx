import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { safeNext } from '../auth/next.ts'
import AuthPanel from '../components/AuthPanel.tsx'
import Mascot from '../components/Mascot.tsx'
import styles from './Welcome.module.css'

// First open on this phone: Ropi says hello, then sign in, create an account, or skip.
// "Skip for now" sits top right, one tap to Home, where 911 is first on screen.
// Shared links (/services/..., /emergency) never land here.
export default function WelcomePage() {
  const { markWelcomed } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next')) ?? '/'

  const done = () => {
    markWelcomed()
    navigate(next, { replace: true })
  }

  return (
    <div className={styles.screen}>
      <header className={styles.top}>
        <span className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            <svg viewBox="6 4 20 24" width="18" height="18">
              <path
                fill="currentColor"
                d="M11 7h6.5a5 5 0 0 1 3.2 8.8A5.3 5.3 0 0 1 18 25h-7zm3.4 3v4.6h2.9a2.3 2.3 0 0 0 0-4.6zm0 7.5V22h3.4a2.25 2.25 0 0 0 0-4.5z"
              />
            </svg>
          </span>
          Bulig
        </span>
        <button type="button" className={styles.skip} onClick={done}>
          Skip for now
        </button>
      </header>

      <main className={styles.body} aria-labelledby="welcome-title">
        <div className={styles.hello}>
          <Mascot variant="ready" height={120} />
          <h1 id="welcome-title" className={styles.title}>
            Welcome to Bulig
          </h1>
          <p className={styles.lead}>Sign in to keep the places you trust one tap away.</p>
        </div>

        <AuthPanel onDone={done} />
      </main>
    </div>
  )
}
