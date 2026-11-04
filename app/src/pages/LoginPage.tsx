import { SignIn } from '@phosphor-icons/react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { safeNext } from '../auth/next.ts'
import AuthLayout, { AuthMark } from '../components/AuthLayout.tsx'
import FormAlert from '../components/FormAlert.tsx'
import { PasswordField, TextField } from '../components/Fields.tsx'
import { EMAIL_INPUT } from '../components/fieldRules.ts'
import { shake } from '../components/shake.ts'
import page from './Page.module.css'
import styles from './Auth.module.css'

const LOGIN_ERRORS = {
  wrong: "That email and password don't match. Check them and try again.",
  suspended: 'Your account is suspended. If you think this is a mistake, contact us.',
  offline: "Couldn't reach Bulig. Check your connection and try again.",
  busy: 'Too many tries. Wait a minute, then try again.',
} as const

// The front door. An account unlocks everything. Emergency (/emergency) stays open without one,
// through a shared link or the hazard button; there is no guest mode (John, 2026-11-04).
export default function LoginPage() {
  const { account, signIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next')) ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const fields = useRef<HTMLDivElement>(null)

  if (account) return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setFormError('Enter your email and password.')
      shake(fields.current)
      return
    }
    setBusy(true)
    const result = await signIn(email, password)
    setBusy(false)
    if (!result.ok) {
      setFormError(LOGIN_ERRORS[result.reason])
      if (result.reason === 'wrong') shake(fields.current)
      return
    }
    navigate(next, { replace: true })
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
        <div ref={fields} className={styles.fields}>
          <TextField
            label="Email"
            placeholder="you@example.com"
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
        </div>
        {formError && <FormAlert onClose={() => setFormError('')}>{formError}</FormAlert>}
        <button type="submit" className={`${page.primaryButton} ${styles.submit}`} disabled={busy}>
          <SignIn size={18} aria-hidden="true" />
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <Link className={`${styles.link} ${styles.forgot}`} to="/forgot-password">
          Forgot password?
        </Link>
      </form>

      <p className={styles.divider}>New to Bulig?</p>
      <Link className={`${page.secondary} ${styles.full}`} to={withNext('/signup')}>
        Create an account
      </Link>
    </AuthLayout>
  )
}
