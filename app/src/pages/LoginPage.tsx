import { LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { safeNext } from '../auth/next.ts'
import AuthLayout, { AuthMark } from '../components/AuthLayout.tsx'
import { PasswordField, TextField } from '../components/Fields.tsx'
import { EMAIL_INPUT } from '../components/fieldRules.ts'
import page from './Page.module.css'
import styles from './Auth.module.css'

// The front door. An account unlocks everything; "Continue without an account" opens Emergency
// only (911 and local authorities), so nobody is ever stuck behind a login when they need help.
export default function LoginPage() {
  const { account, signIn, continueAsGuest } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next')) ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  if (account) return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setFormError('Enter your email and password.')
      return
    }
    setBusy(true)
    const ok = await signIn(email, password)
    setBusy(false)
    if (!ok) {
      setFormError("That email and password don't match. Check them and try again.")
      return
    }
    navigate(next, { replace: true })
  }

  const asGuest = () => {
    continueAsGuest()
    navigate('/emergency', { replace: true })
  }

  const withNext = (path: string) => (next === '/' ? path : `${path}?next=${encodeURIComponent(next)}`)

  return (
    <AuthLayout>
      <AuthMark />
      <div className={styles.head}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.lead}>Sign in to find help along the way.</p>
      </div>

      <form className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="Email"
          {...EMAIL_INPUT}
          autoComplete="username"
          enterKeyHint="next"
          value={email}
          error={emailError}
          onChange={(v) => {
            setEmail(v)
            setEmailError('')
            setFormError('')
          }}
          onBlur={() => setEmailError(email && !email.includes('@') ? 'Enter an email like name@example.com.' : '')}
        />
        <PasswordField
          autoComplete="current-password"
          enterKeyHint="go"
          value={password}
          onChange={(v) => {
            setPassword(v)
            setFormError('')
          }}
        />
        {formError && (
          <p className={page.error} role="alert">
            {formError}
          </p>
        )}
        <button type="submit" className={`${page.primaryButton} ${styles.submit}`} disabled={busy}>
          <LogIn size={18} strokeWidth={2} aria-hidden="true" />
          Sign in
        </button>
        <Link className={`${styles.link} ${styles.forgot}`} to="/forgot-password">
          Forgot password?
        </Link>
      </form>

      <p className={styles.divider}>New to Bulig?</p>
      <Link className={`${page.secondary} ${styles.full}`} to={withNext('/signup')}>
        Create an account
      </Link>

      <div className={styles.guest}>
        <button type="button" className={styles.link} onClick={asGuest}>
          Continue without an account
        </button>
        <span className={styles.guestNote}>Emergency numbers only</span>
      </div>
    </AuthLayout>
  )
}
