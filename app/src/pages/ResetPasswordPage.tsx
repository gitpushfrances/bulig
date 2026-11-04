import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../auth/context.ts'
import AuthLayout, { AuthMark } from '../components/AuthLayout.tsx'
import { PasswordField } from '../components/Fields.tsx'
import { MIN_PASSWORD } from './AccountPages.tsx'
import RopiSays from '../components/RopiSays.tsx'
import page from './Page.module.css'
import styles from './Auth.module.css'

// Where the emailed reset link lands: /reset-password?token=…&email=… (API.md §4.5).
// On success every device is signed out, so the person signs in again with the new password.
export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`)
    if (password !== confirm) return setError("The passwords don't match.")
    setBusy(true)
    const result = await resetPassword(email, token, password)
    setBusy(false)
    if (result === 'ok') return setDone(true)
    setError(
      result === 'offline'
        ? "Couldn't reach Bulig. Check your connection and try again."
        : 'This link has expired or was already used. Ask for a new one.',
    )
  }

  if (!token || !email) {
    return (
      <AuthLayout>
        <AuthMark />
        <p className={styles.lead}>This reset link is incomplete. Ask for a new one.</p>
        <Link className={`${page.primaryButton} ${styles.submit}`} to="/forgot-password">
          Get a new link
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout panel={!done}>
      {done ? (
        <>
          <RopiSays variant="friendly" height={120}>
            <strong>Password changed.</strong> Sign in with your new password.
          </RopiSays>
          <Link className={`${page.primaryButton} ${styles.submit}`} to="/login">
            Sign in
          </Link>
        </>
      ) : (
        <>
          <AuthMark />
          <div className={styles.head}>
            <h1 className={styles.title}>Make a new password</h1>
            <p className={styles.lead}>For {email}.</p>
          </div>
          <form className={styles.form} onSubmit={submit} noValidate>
            <PasswordField
              label="New password"
              autoComplete="new-password"
              hint={`At least ${MIN_PASSWORD} characters.`}
              value={password}
              onChange={(v) => {
                setPassword(v)
                setError('')
              }}
            />
            <PasswordField
              label="Confirm new password"
              autoComplete="new-password"
              value={confirm}
              onChange={(v) => {
                setConfirm(v)
                setError('')
              }}
            />
            {error && (
              <p className={page.error} role="alert">
                {error}
              </p>
            )}
            <button type="submit" className={`${page.primaryButton} ${styles.submit}`} disabled={busy}>
              <KeyRound size={18} strokeWidth={2} aria-hidden="true" />
              Save new password
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
