import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  Disc,
  Fuel,
  Heart,
  LocateFixed,
  OctagonAlert,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserPlus,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { canRegister } from '../auth/localAccounts.ts'
import { safeNext } from '../auth/next.ts'
import AuthLayout from '../components/AuthLayout.tsx'
import { PasswordField, TextField } from '../components/Fields.tsx'
import { EMAIL_INPUT, looksLikeEmail } from '../components/fieldRules.ts'
import type { MascotVariant } from '../components/Mascot.tsx'
import RopiSays from '../components/RopiSays.tsx'
import page from './Page.module.css'
import styles from './Auth.module.css'

const MIN_PASSWORD = 8

interface Step {
  ropi: MascotVariant
  says: ReactNode
  title: string
  points?: { icon: LucideIcon; title: string; text: string }[]
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
        icon: LocateFixed,
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
      { icon: Disc, title: 'Flat tire?', text: 'Open Vulcanizing: the nearest shop first, with Call and Directions.' },
      { icon: Fuel, title: 'Low on gas or need a mechanic?', text: 'Gas stations and mechanics near you, nearest first.' },
      { icon: Sparkles, title: 'Hungry or need a room?', text: 'Restos, hotels, and new local stalls under Others.' },
      { icon: Heart, title: 'Keep the good ones', text: 'Tap the heart to save places you trust.' },
    ],
  },
  {
    ropi: 'thinking',
    says: 'Why use Bulig and not just search?',
    title: 'Why Bulig',
    points: [
      { icon: CircleCheck, title: 'Checked, with dates', text: 'Every number and place shows when it was last checked.' },
      { icon: WifiOff, title: 'Works with no signal', text: 'After one visit, numbers and places stay on your phone.' },
      { icon: ShieldCheck, title: 'Free and clean', text: 'No ads, no paywall, and nothing ever stands in front of 911.' },
    ],
  },
  {
    ropi: 'head',
    says: 'One last thing: staying safe.',
    title: 'Safety first',
    points: [
      { icon: TriangleAlert, title: 'Emergency is one tap away', text: 'The red button on every screen opens 911 and local authorities.' },
      { icon: OctagonAlert, title: 'Pull over first', text: 'Use your phone only when you have stopped safely.' },
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

function SignupForm({ onBack, next }: { onBack: () => void; next: string }) {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; agreed?: string }>({})
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
    if (Object.values(found).some(Boolean)) return
    setBusy(true)
    const result = await register({ name, email, password })
    setBusy(false)
    if (!result.ok) {
      setFormError(result.reason)
      return
    }
    navigate(next, { replace: true })
  }

  if (!canRegister()) {
    return <p className={styles.preview}>Creating an account needs a secure (https) connection. Open Bulig from its usual address.</p>
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
      {formError === 'taken' && (
        <p className={page.error} role="alert">
          That email already has an account.{' '}
          <Link className={styles.link} to="/login">
            Sign in instead
          </Link>
        </p>
      )}
      {formError === 'unavailable' && (
        <p className={page.error} role="alert">
          Creating an account needs a secure (https) connection. Open Bulig from its usual address.
        </p>
      )}
      <div className={styles.nav}>
        <button type="button" className={page.secondary} onClick={onBack}>
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
          Back
        </button>
        <button type="submit" className={page.primaryButton} disabled={busy}>
          <UserPlus size={18} strokeWidth={2} aria-hidden="true" />
          Create account
        </button>
      </div>
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
        {!onForm && (
          <button type="button" className={`${styles.link} ${styles.skipIntro}`} onClick={() => setAt(FORM_STEP)}>
            Skip intro
          </button>
        )}
      </div>

      <div key={at} className={styles.step}>
        {onForm ? (
          <>
            <RopiSays variant="friendly" height={110}>
              <strong>Let&apos;s get started!</strong> Make your account.
            </RopiSays>
            <h1 ref={heading} tabIndex={-1} className={styles.stepTitle}>
              Create your account
            </h1>
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
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
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
        <SignupForm onBack={() => setAt(FORM_STEP - 1)} next={next} />
      ) : (
        <div className={styles.nav}>
          {at > 0 && (
            <button type="button" className={page.secondary} onClick={() => setAt(at - 1)}>
              <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
              Back
            </button>
          )}
          <button type="button" className={`${page.primaryButton} ${styles.submit}`} onClick={() => setAt(at + 1)}>
            {at === FORM_STEP - 1 ? "Let's get started" : 'Next'}
            <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
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
