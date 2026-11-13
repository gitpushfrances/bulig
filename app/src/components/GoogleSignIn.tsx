import { Copy } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { GOOGLE_CLIENT_ID, inAppBrowser, listenForGoogle, loadGoogle } from '../auth/google.ts'
import FormAlert from './FormAlert.tsx'
import Spinner from './Spinner.tsx'
import styles from '../pages/Auth.module.css'

const ERRORS = {
  invalid: "Google couldn't confirm your sign-in. Try again.",
  suspended: 'Your account is suspended. If you think this is a mistake, contact us.',
  offline: "Couldn't reach Bulig. Check your connection and try again.",
  busy: 'Too many tries. Wait a minute, then try again.',
  unavailable: "Google sign-in isn't available right now. Use your email and password.",
} as const

function isDark(): boolean {
  const theme = document.documentElement.getAttribute('data-theme')
  if (theme) return theme === 'dark'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

// "Continue with Google" under the sign-in and sign-up forms (API.md §4.7). Shows nothing until the
// build has a Google client ID and talks to the server, so it can ship before the backend has it.
// After a new account it lands on `next` like any sign-in; Home then offers "Finish your profile".
// Sign-in puts it under the form ("or" above it); sign-up puts it first, since it's the quick way in.
export default function GoogleSignIn({ next, mode }: { next: string; mode: 'signin' | 'signup' }) {
  const { signInWithGoogle, accountsOnline } = useAuth()
  const navigate = useNavigate()
  const slot = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const enabled = !!GOOGLE_CLIENT_ID && accountsOnline
  const blockedIn = enabled ? inAppBrowser() : null

  // The latest handler, so the one GIS callback always uses this screen's `next`.
  const handle = useRef<(idToken: string) => void>(() => {})
  useEffect(() => {
    handle.current = async (idToken: string) => {
      setError('')
      setBusy(true)
      const result = await signInWithGoogle(idToken)
      setBusy(false)
      if (!result.ok) return setError(ERRORS[result.reason])
      navigate(next, { replace: true })
    }
  })

  useEffect(() => {
    if (!enabled || blockedIn || !GOOGLE_CLIENT_ID) return
    const clientId = GOOGLE_CLIENT_ID
    let live = true
    loadGoogle()
      .then((id) => {
        if (!live || !slot.current) return
        listenForGoogle(id, clientId, (token) => void handle.current(token))
        const width = Math.round(Math.min(400, Math.max(200, slot.current.clientWidth)))
        slot.current.replaceChildren()
        id.renderButton(slot.current, {
          type: 'standard',
          theme: isDark() ? 'filled_black' : 'outline',
          size: 'large',
          text: mode === 'signup' ? 'signup_with' : 'continue_with',
          shape: 'pill',
          logo_alignment: 'center',
          width,
          locale: 'en',
        })
        setState('ready')
      })
      .catch(() => live && setState('failed'))
    return () => {
      live = false
    }
  }, [enabled, blockedIn, mode])

  if (!enabled) return null

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={styles.google}>
      {mode === 'signin' && <p className={styles.divider}>or</p>}
      {blockedIn ? (
        <div className={styles.inApp} role="note">
          <p>
            <strong>Google sign-in doesn&apos;t work inside {blockedIn}.</strong> Open Bulig in Chrome: tap ⋮ (or ⋯), then{' '}
            <em>Open in browser</em>. Or sign in with your email above.
          </p>
          <button type="button" className={styles.link} onClick={copyLink}>
            <Copy size={18} aria-hidden="true" />
            {copied ? 'Link copied' : 'Copy the link'}
          </button>
        </div>
      ) : (
        <>
          <div className={styles.googleSlot} aria-busy={busy || state === 'loading'}>
            {/* Google draws its own button here (its branding rules). */}
            <div ref={slot} className={styles.googleButton} />
            {(busy || state === 'loading') && (
              <span className={styles.googleBusy}>
                <Spinner />
                <span className="visually-hidden">{busy ? 'Signing in with Google…' : 'Loading Google sign-in…'}</span>
              </span>
            )}
          </div>
          {state === 'failed' && <p className={styles.small}>Google sign-in needs a connection. Use your email for now.</p>}
          <p className={styles.small}>
            By continuing with Google you agree to the <Link to="/terms">Terms of Use</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>. Bulig gets your name and email from Google, nothing else.
          </p>
        </>
      )}
      {error && <FormAlert onClose={() => setError('')}>{error}</FormAlert>}
      {mode === 'signup' && <p className={styles.divider}>or use your email</p>}
    </div>
  )
}
