import { ArrowLeft, ArrowRight, CheckCircle, Crosshair, GasPump, Heart, type Icon, PhoneCall, ShieldCheck, Sparkle, Tire, UserPlus, Warning, WarningOctagon, WifiSlash } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { canRegister } from '../auth/canRegister.ts'
import { safeNext } from '../auth/next.ts'
import AuthLayout, { AuthMark } from '../components/AuthLayout.tsx'
import FormAlert from '../components/FormAlert.tsx'
import { PasswordField, TextField } from '../components/Fields.tsx'
import { EMAIL_INPUT, looksLikeEmail } from '../components/fieldRules.ts'
import type { MascotVariant } from '../components/Mascot.tsx'
import { shake, shakeInvalid } from '../components/shake.ts'
import RopiSays from '../components/RopiSays.tsx'
import page from './Page.module.css'
import styles from './Auth.module.css'

const MIN_PASSWORD = 8

interface Step {
  ropi: MascotVariant
  says: ReactNode
  title: string
  points?: { icon: Icon; title: string; text: string }[]
}

// Ropi explains Bulig in four short steps, then the account form. Every step can be skipped.
const STEPS: Step[] = [
  {
    ropi: 'ready',
    says: (
      <>
        <strong>Hi, I&apos;m Ropi!</strong> I&apos;ll show you around Bulig. It takes a minute.
      </>
    ),
    title: 'Help along the way',
    points: [
      {
        icon: ShieldCheck,
        title: 'What Bulig is',
        text: 'Checked emergency numbers and the nearest road services, wherever you travel in the Philippines.',
      },
      {
        icon: Crosshair,
        title: 'Built around where you are',
        text: 'Bulig finds your barangay and town from GPS and sorts every place by distance.',
      },
    ],
  },
  {
    ropi: 'friendly',
    says: "Here's how it helps on a normal day.",
    title: 'Every day on the road',
    points: [
      { icon: Tire, title: 'Flat tire?', text: 'Open Vulcanizing: the nearest shop first, with Call and Directions.' },
      { icon: GasPump, title: 'Low on gas or need a mechanic?', text: 'Gas stations and mechanics near you, nearest first.' },
      { icon: Sparkle, title: 'Hungry or need a room?', text: 'Restos, hotels, and new local stalls under Others.' },
      { icon: Heart, title: 'Keep the good ones', text: 'Tap the heart to save places you trust.' },
    ],
  },
  {
    ropi: 'thinking',
    says: 'Why use Bulig and not just search?',
    title: 'Why Bulig',
    points: [
      { icon: CheckCircle, title: 'Checked, with dates', text: 'Every number and place shows when it was last checked.' },
      { icon: WifiSlash, title: 'Works with no signal', text: 'After one visit, numbers and places stay on your phone.' },
      { icon: ShieldCheck, title: 'Free and clean', text: 'No ads, no paywall, and nothing ever stands in front of 911.' },
    ],
  },
  {
    ropi: 'head',
    says: 'One last thing: staying safe.',
    title: 'Safety first',
    points: [
      { icon: Warning, title: 'Emergency is one tap away', text: 'The red button on every screen opens 911 and local authorities.' },
      { icon: WarningOctagon, title: 'Pull over first', text: 'Use your phone only when you have stopped safely.' },
      { icon: PhoneCall, title: 'Always call', text: 'Bulig shows numbers. It never sends help or your location by itself.' },
    ],
  },
]

const FORM_STEP = STEPS.length

function Dots({ at }: { at: number }) {
  return (
    <div className={styles.dots} role="img" aria-label={`Step ${at + 1} of ${FORM_STEP + 1}`}>
      {Array.from({ length: FORM_STEP + 1 }, (_, i) => (
        <span key={i} className={`${styles.dot} ${i === at ? styles.dotOn : ''}`} />
      ))}
    </div>
  )
}

const SIGNUP_ERRORS = {
  offline: "Couldn't reach Bulig. Check your connection and try again.",
  invalid: "Bulig couldn't accept those details. Check your name, email and password.",
  unavailable: 'Creating an account needs a secure (https) connection. Open Bulig from its usual address.',
} as const

function SignupForm({ next }: { next: string }) {
  const { register, accountsOnline } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; agreed?: string }>({})
  const [formError, setFormError] = useState<'taken' | 'unavailable' | 'offline' | 'invalid' | null>(null)
  const [busy, setBusy] = useState(false)
  const form = useRef<HTMLFormElement>(null)

  const check = {
    name: (v: string) => (v.trim() ? '' : 'Enter your name.'),
    email: (v: string) => (looksLikeEmail(v) ? '' : 'Enter an email like name@example.com.'),
    password: (v: string) => (v.length >= MIN_PASSWORD ? '' : `Use at least ${MIN_PASSWORD} characters.`),
  }
  // Errors show after leaving a field, and clear as soon as it is typed in.
  const blur = (field: keyof typeof check, value: string) =>
    setErrors((e) => ({ ...e, [field]: value ? check[field](value) : '' }))
  const clear = (field: keyof typeof errors) => {
    setErrors((e) => ({ ...e, [field]: '' }))
    setFormError(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = {
      name: check.name(name),
      email: check.email(email),
      password: check.password(password),
      agreed: agreed ? '' : 'Agree to the Terms and Privacy Policy to continue.',
    }
    setErrors(found)
    if (Object.values(found).some(Boolean)) return shakeInvalid(form.current, `.${page.field}`)
    setBusy(true)
    const result = await register({ name, email, password })
    setBusy(false)
    if (!result.ok) {
      setFormError(result.reason)
      shake(form.current?.querySelector(`.${page.field}:nth-child(2)`)) // the email: "taken" is the usual one
      return
    }
    navigate(next, { replace: true })
  }

  if (!accountsOnline && !canRegister()) {
    return <p className={styles.preview}>Creating an account needs a secure (https) connection. Open Bulig from its usual address.</p>
  }

  return (
    <form ref={form} className={styles.form} onSubmit={submit} noValidate>
      <TextField
        label="Full name"
        placeholder="e.g. Juan Dela Cruz"
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
        placeholder="juan@example.com"
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
        autoComplete="new-password"
        enterKeyHint="done"
        value={password}
        hint={`At least ${MIN_PASSWORD} characters.`}
        error={errors.password}
        onChange={(v) => {
          setPassword(v)
          clear('password')
        }}
        onBlur={() => blur('password', password)}
      />
      <div className={page.field}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={agreed}
            aria-invalid={errors.agreed ? true : undefined}
            aria-describedby={errors.agreed ? 'agree-error' : undefined}
            onChange={(e) => {
              setAgreed(e.target.checked)
              clear('agreed')
            }}
          />
          <span>
            I agree to the <Link to="/terms">Terms of Use</Link> and <Link to="/privacy">Privacy Policy</Link>.
          </span>
        </label>
        {errors.agreed && (
          <span id="agree-error" className={page.error}>
            {errors.agreed}
          </span>
        )}
      </div>
      {formError && (
        <FormAlert onClose={() => setFormError(null)}>
          {formError === 'taken' ? (
            <>
              That email already has an account.{' '}
              <Link to="/login">Sign in instead</Link>
            </>
          ) : (
            SIGNUP_ERRORS[formError]
          )}
        </FormAlert>
      )}
      <button type="submit" className={`${page.primaryButton} ${styles.submit}`} disabled={busy}>
        <UserPlus size={18} aria-hidden="true" />
        {busy ? 'Creating your account…' : 'Create account'}
      </button>
    </form>
  )
}

// Sign up is the onboarding: Ropi explains what Bulig is for, then the account form.
export default function SignupPage() {
  const { account } = useAuth()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next')) ?? '/'
  const [at, setAt] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)

  // Each step moves focus to its heading, so screen readers hear the new step.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    heading.current?.focus()
  }, [at])

  if (account) return <Navigate to={next} replace />

  const step = STEPS[at]
  const onForm = at === FORM_STEP

  return (
    <AuthLayout wide panel={false}>
      <div className={styles.stepTop}>
        <Dots at={at} />
        {onForm ? (
          <button type="button" className={`${styles.link} ${styles.skipIntro}`} onClick={() => setAt(FORM_STEP - 1)}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </button>
        ) : (
          <button type="button" className={`${styles.link} ${styles.skipIntro}`} onClick={() => setAt(FORM_STEP)}>
            Skip intro
          </button>
        )}
      </div>

      <div key={at} className={styles.step}>
        {onForm ? (
          <>
            <AuthMark always />
            <div className={styles.head}>
              <h1 ref={heading} tabIndex={-1} className={styles.title}>
                Create your account
              </h1>
              <p className={styles.lead}>Join Bulig to find help and share road updates.</p>
            </div>
          </>
        ) : (
          <>
            <RopiSays variant={step.ropi} height={120}>
              {step.says}
            </RopiSays>
            <h1 ref={heading} tabIndex={-1} className={styles.stepTitle}>
              {step.title}
            </h1>
            {step.points && (
              <ul className={styles.points}>
                {step.points.map(({ icon: Icon, title, text }) => (
                  <li key={title} className={styles.point}>
                    <Icon size={20} aria-hidden="true" />
                    <p>
                      <strong>{title}</strong>
                      <span>{text}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {onForm ? (
        <SignupForm next={next} />
      ) : (
        <div className={styles.nav}>
          {at > 0 && (
            <button type="button" className={page.secondary} onClick={() => setAt(at - 1)}>
              <ArrowLeft size={18} aria-hidden="true" />
              Back
            </button>
          )}
          <button type="button" className={`${page.primaryButton} ${styles.submit}`} onClick={() => setAt(at + 1)}>
            {at === FORM_STEP - 1 ? "Let's get started" : 'Next'}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      <p className={styles.center}>
        Already have an account?{' '}
        <Link className={styles.link} to={next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
