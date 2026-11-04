import { ArrowLeft, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/context.ts'
import AuthLayout, { AuthMark } from '../components/AuthLayout.tsx'
import { TextField } from '../components/Fields.tsx'
import { EMAIL_INPUT, looksLikeEmail } from '../components/fieldRules.ts'
import RopiSays from '../components/RopiSays.tsx'
import page from './Page.module.css'
import styles from './Auth.module.css'

// Asks the server for a reset link (API.md §4.4). Phone-only builds show it as a preview and
// send nothing. The confirmation never says whether the email has an account.
export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState<'sent' | 'preview' | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!looksLikeEmail(email)) {
      setError('Enter an email like name@example.com.')
      return
    }
    setBusy(true)
    const result = await forgotPassword(email)
    setBusy(false)
    if (result === 'offline') {
      setError("Couldn't reach Bulig. Check your connection and try again.")
      return
    }
    setSent(result)
  }

  return (
    <AuthLayout panel={!sent}>
      {sent ? (
        <>
          <RopiSays variant="friendly" height={120}>
            <strong>Check your inbox.</strong> If {email.trim()} has an account, a reset link is on its way.
          </RopiSays>
          {sent === 'preview' && (
            <p className={styles.preview}>
              Preview: reset emails start when accounts move online. Nothing was sent from this phone.
            </p>
          )}
          <Link className={`${page.primaryButton} ${styles.submit}`} to="/login">
            Back to sign in
          </Link>
        </>
      ) : (
        <>
          <AuthMark />
          <div className={styles.head}>
            <h1 className={styles.title}>Forgot your password?</h1>
            <p className={styles.lead}>Enter your email and we&apos;ll send you a link to make a new one.</p>
          </div>
          <form className={styles.form} onSubmit={submit} noValidate>
            <TextField
              label="Email"
              {...EMAIL_INPUT}
              autoComplete="email"
              enterKeyHint="send"
              value={email}
              error={error}
              onChange={(v) => {
                setEmail(v)
                setError('')
              }}
            />
            <button type="submit" className={`${page.primaryButton} ${styles.submit}`} disabled={busy}>
              <Send size={18} strokeWidth={2} aria-hidden="true" />
              Send reset link
            </button>
          </form>
          <Link className={`${styles.link} ${styles.forgot}`} to="/login">
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            Back to sign in
          </Link>
        </>
      )}
    </AuthLayout>
  )
}
