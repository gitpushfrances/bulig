import { SignIn } from '@phosphor-icons/react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { safeNext } from '../auth/next.ts'
import AuthLayout, { AuthMark } from '../components/AuthLayout.tsx'
import FormAlert from '../components/FormAlert.tsx'
import { BusyContent } from '../components/Spinner.tsx'
import { PasswordField, TextField } from '../components/Fields.tsx'
import { USERNAME_INPUT } from '../auth/username.ts'
import { shake } from '../components/shake.ts'
import page from './Page.module.css'
import styles from './Auth.module.css'

const LOGIN_ERRORS = {
  wrong: "That username or email and password don't match. Check them and try again.",
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
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  // Wrong username, email or password: the server never says which (API.md §4.2), so both turn red and the
  // password shakes (the usual culprit). No signal or too many tries: no field is wrong.
  const [wrong, setWrong] = useState(false)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const passwordRef = useRef<HTMLDivElement>(null)

  if (account) return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const missing = { login: login.trim() ? '' : 'Enter your username or email.', password: password ? '' : 'Enter your password.' }
    if (missing.login || missing.password) {
      setLoginError(missing.login)
      setPasswordError(missing.password)
      return
    }
    setBusy(true)
    const result = await signIn(login, password)
    setBusy(false)
    if (!result.ok) {
      setFormError(LOGIN_ERRORS[result.reason])
      if (result.reason === 'wrong') {
        setWrong(true)
        shake(passwordRef.current)
      }
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
        <div className={styles.fields}>
          {/* Username or email (API.md §4.2): a plain text box, so the keyboard doesn't assume an email. */}
          <TextField
            label="Username or email"
            placeholder="juan.dc or you@example.com"
            type="text"
            {...USERNAME_INPUT}
            autoComplete="username"
            enterKeyHint="next"
            value={login}
            error={loginError}
            invalid={wrong}
            onChange={(v) => {
              setLogin(v)
              setLoginError('')
              setFormError('')
              setWrong(false)
            }}
          />
          <div ref={passwordRef}>
            <PasswordField
              autoComplete="current-password"
              enterKeyHint="go"
              value={password}
              error={passwordError}
              invalid={wrong}
              onChange={(v) => {
                setPassword(v)
                setPasswordError('')
                setFormError('')
                setWrong(false)
              }}
            />
          </div>
        </div>
        {formError && (
          <FormAlert
            onClose={() => {
              setFormError('')
              setWrong(false)
            }}
          >
            {formError}
          </FormAlert>
        )}
        <button type="submit" className={`${page.primaryButton} ${styles.submit}`} disabled={busy} aria-busy={busy}>
          <BusyContent busy={busy} busyLabel="Signing in…">
            <SignIn size={18} aria-hidden="true" />
            Sign in
          </BusyContent>
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
