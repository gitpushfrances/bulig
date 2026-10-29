import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useId, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { useAuth } from '../auth/context.ts'
import { canRegister } from '../auth/localAccounts.ts'
import { TEST_ACCOUNTS, TEST_PASSWORD } from '../auth/testAccount.ts'
import { ROLE_LABELS, ROLES } from '../auth/types.ts'
import styles from '../pages/Page.module.css'

type Mode = 'signin' | 'register'

const MIN_PASSWORD = 8
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className' | 'onChange'>

// A labelled text input. The error sits outside the label, so the field's name stays the label.
function TextField({
  label,
  error,
  onChange,
  ...input
}: InputProps & { label: string; error?: string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        {...input}
      />
      {error && (
        <span id={`${id}-error`} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  )
}

const EMAIL_INPUT = {
  type: 'email',
  autoCapitalize: 'none',
  autoCorrect: 'off',
  inputMode: 'email',
} as const

function PasswordField({
  value,
  onChange,
  onBlur,
  autoComplete,
  error,
  hint,
}: {
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  autoComplete: 'current-password' | 'new-password'
  error?: string
  hint?: string
}) {
  const [show, setShow] = useState(false)
  const id = useId()
  // The hint and error sit outside the label, so the field's name stays just "Password".
  const describedBy = [hint && !error && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        Password
      </label>
      <span className={styles.control}>
        <input
          id={id}
          className={`${styles.input} ${styles.withTrail}`}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          enterKeyHint="go"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
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
      {hint && !error && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  )
}

function SignInForm({ onDone, email, setEmail }: { onDone: () => void; email: string; setEmail: (v: string) => void }) {
  const { signIn } = useAuth()
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const ok = await signIn(email, password)
    setBusy(false)
    if (!ok) {
      setFormError("That email and password don't match. Check them and try again.")
      return
    }
    onDone()
  }

  return (
    <>
      <div className={`${styles.notice} ${styles.warn}`}>
        <p>
          <strong>Test logins.</strong> Each uses the password <strong>{TEST_PASSWORD}</strong>.
        </p>
        <div className={styles.fillRow}>
          {ROLES.map((role) => (
            <button
              key={role}
              type="button"
              className={styles.chip}
              aria-label={`Fill in test login: ${ROLE_LABELS[role]}`}
              onClick={() => {
                setEmail(TEST_ACCOUNTS[role].email)
                setPassword(TEST_PASSWORD)
                setEmailError('')
                setFormError('')
              }}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      </div>

      <form className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="Email"
          {...EMAIL_INPUT}
          autoComplete="username"
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
          value={password}
          autoComplete="current-password"
          onChange={(v) => {
            setPassword(v)
            setFormError('')
          }}
        />
        {formError && (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        )}
        <button type="submit" className={styles.primaryButton} disabled={busy}>
          <LogIn size={18} strokeWidth={2} aria-hidden="true" />
          Sign in
        </button>
      </form>
    </>
  )
}

function RegisterForm({
  onDone,
  email,
  setEmail,
  toSignIn,
}: {
  onDone: () => void
  email: string
  setEmail: (v: string) => void
  toSignIn: () => void
}) {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})
  const [formError, setFormError] = useState<'taken' | 'unavailable' | null>(null)
  const [busy, setBusy] = useState(false)

  const check = {
    name: (v: string) => (v.trim() ? '' : 'Enter your name.'),
    email: (v: string) => (looksLikeEmail(v) ? '' : 'Enter an email like name@example.com.'),
    password: (v: string) => (v.length >= MIN_PASSWORD ? '' : `Use at least ${MIN_PASSWORD} characters.`),
  }
  // Errors show after leaving a field, and clear as soon as it is typed in.
  const blur = (field: keyof typeof check, value: string) =>
    setErrors((e) => ({ ...e, [field]: value ? check[field](value) : '' }))
  const clear = (field: keyof typeof check) => {
    setErrors((e) => ({ ...e, [field]: '' }))
    setFormError(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next = { name: check.name(name), email: check.email(email), password: check.password(password) }
    setErrors(next)
    if (next.name || next.email || next.password) return
    setBusy(true)
    const result = await register({ name, email, password })
    setBusy(false)
    if (!result.ok) {
      setFormError(result.reason)
      return
    }
    onDone()
  }

  if (!canRegister()) {
    return (
      <p className={styles.notice}>Creating an account needs a secure (https) connection. Open Bulig from its usual address.</p>
    )
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField
        label="Name"
        type="text"
        autoComplete="name"
        enterKeyHint="next"
        value={name}
        error={errors.name}
        onChange={(v) => {
          setName(v)
          clear('name')
        }}
        onBlur={() => blur('name', name)}
      />
      <TextField
        label="Email"
        {...EMAIL_INPUT}
        autoComplete="email"
        enterKeyHint="next"
        value={email}
        error={errors.email}
        onChange={(v) => {
          setEmail(v)
          clear('email')
        }}
        onBlur={() => blur('email', email)}
      />
      <PasswordField
        value={password}
        autoComplete="new-password"
        hint={`At least ${MIN_PASSWORD} characters. Use one you don't use anywhere else.`}
        error={errors.password}
        onChange={(v) => {
          setPassword(v)
          clear('password')
        }}
        onBlur={() => blur('password', password)}
      />
      {formError === 'taken' && (
        <div className={styles.inlineAlert} role="alert">
          <p className={styles.error}>That email already has an account on this phone.</p>
          <button type="button" className={styles.textButton} onClick={toSignIn}>
            Sign in instead
          </button>
        </div>
      )}
      {formError === 'unavailable' && (
        <p className={styles.error} role="alert">
          Creating an account needs a secure (https) connection. Open Bulig from its usual address.
        </p>
      )}
      <button type="submit" className={styles.primaryButton} disabled={busy}>
        <UserPlus size={18} strokeWidth={2} aria-hidden="true" />
        Create account
      </button>
      <p className={styles.fine}>For now your account is kept on this phone only. Saved places stay with it.</p>
    </form>
  )
}

// Sign in or create an account. Used on Welcome and on Profile while signed out.
export default function AuthPanel({ onDone, initial = 'signin' }: { onDone: () => void; initial?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial)
  // Shared, so switching from "Create account" to "Sign in" keeps the email typed.
  const [email, setEmail] = useState('')

  const tabs: { id: Mode; label: string }[] = [
    { id: 'signin', label: 'Sign in' },
    { id: 'register', label: 'Create account' },
  ]

  return (
    <div className={`${styles.card} ${styles.authCard}`}>
      <div
        className={styles.segmented}
        role="tablist"
        aria-label="Account"
        // Arrow keys move between the two tabs, as in any tab list.
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          const next = mode === 'signin' ? 'register' : 'signin'
          setMode(next)
          document.getElementById(`auth-tab-${next}`)?.focus()
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`auth-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={mode === t.id}
            aria-controls="auth-panel"
            tabIndex={mode === t.id ? 0 : -1}
            onClick={() => setMode(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="auth-panel" role="tabpanel" aria-labelledby={`auth-tab-${mode}`} className={styles.authCard}>
        {mode === 'signin' ? (
          <SignInForm onDone={onDone} email={email} setEmail={setEmail} />
        ) : (
          <RegisterForm onDone={onDone} email={email} setEmail={setEmail} toSignIn={() => setMode('signin')} />
        )}
      </div>
    </div>
  )
}
