import { ChevronRight, Eye, EyeOff, LogIn, LogOut } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { TEST_LOGIN } from '../auth/testAccount.ts'
import { ROLE_LABELS, type Role } from '../auth/types.ts'
import styles from './Page.module.css'

const ROLE_HELP: Record<Role, string> = {
  user: 'You can save places and numbers.',
  moderator: 'You check and update records for the areas you look after.',
  admin: 'You manage areas, moderators and every record.',
}

// Only return to a page inside the app, never to another site.
function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null
}

function SignInForm() {
  const { signIn } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!signIn(email, password)) {
      setFormError("That email and password don't match. Check them and try again.")
      return
    }
    const next = safeNext(params.get('next'))
    if (next) navigate(next)
  }

  return (
    <>
      <div className={`${styles.notice} ${styles.warn}`}>
        <p>
          <strong>Test sign-in.</strong> Use <strong>{TEST_LOGIN.email}</strong> with the password{' '}
          <strong>{TEST_LOGIN.password}</strong>. What you save stays on this phone.
        </p>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            setEmail(TEST_LOGIN.email)
            setPassword(TEST_LOGIN.password)
            setEmailError('')
            setFormError('')
          }}
        >
          Fill in test login
        </button>
      </div>

      <form className={`${styles.card} ${styles.form}`} onSubmit={submit} noValidate>
        <h2 className={styles.sectionTitle}>Sign in</h2>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Email</span>
          <input
            className={styles.input}
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
            value={email}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? 'email-error' : undefined}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailError('')
              setFormError('')
            }}
            onBlur={() => setEmailError(email && !email.includes('@') ? 'Enter an email like name@example.com.' : '')}
          />
          {emailError && (
            <span id="email-error" className={styles.error}>
              {emailError}
            </span>
          )}
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Password</span>
          <span className={styles.control}>
            <input
              className={`${styles.input} ${styles.withTrail}`}
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              enterKeyHint="go"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setFormError('')
              }}
            />
            <button
              type="button"
              className={styles.reveal}
              aria-pressed={show}
              aria-label="Show password"
              onClick={() => setShow((s) => !s)}
            >
              {show ? (
                <EyeOff size={20} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Eye size={20} strokeWidth={1.75} aria-hidden="true" />
              )}
            </button>
          </span>
        </label>
        {formError && (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        )}
        <button type="submit" className={styles.primaryButton}>
          <LogIn size={18} strokeWidth={2} aria-hidden="true" />
          Sign in
        </button>
      </form>
    </>
  )
}

export default function ProfilePage() {
  const { account, signOut, saved } = useAuth()

  return (
    <section className={styles.page} aria-labelledby="profile-title">
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
          <div className={styles.profile}>
            <h2 className={styles.sectionTitle}>{account.name}</h2>
            <p className={styles.count}>{account.email}</p>
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
        <SignInForm />
      )}

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
