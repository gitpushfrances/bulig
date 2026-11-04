import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../auth/context.ts'
import type { ConfirmEmailResult } from '../auth/store.ts'
import AuthLayout, { AuthMark } from '../components/AuthLayout.tsx'
import RopiSays from '../components/RopiSays.tsx'
import page from './Page.module.css'
import styles from './Auth.module.css'

const FAILED: Record<Exclude<ConfirmEmailResult, { ok: true }>['reason'], string> = {
  invalid: 'That link has expired or was already used. Ask for a new one from Profile → Change email.',
  taken: 'Another account took that email in the meantime, so your email stays the same.',
  offline: "Couldn't reach Bulig. Check your connection and open the link again.",
  preview: "This version of Bulig can't change emails.",
}

// Where the emailed link lands: /confirm-email?token=… (API.md §4.6). Works signed out, on any browser.
export default function ConfirmEmailPage() {
  const { account, confirmEmail } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [result, setResult] = useState<ConfirmEmailResult | null>(null)
  const sent = useRef(false)

  // Once only: the token works one time, and StrictMode runs effects twice in development.
  useEffect(() => {
    if (!token || sent.current) return
    sent.current = true
    void confirmEmail(token).then(setResult)
  }, [token, confirmEmail])

  const next = account ? (
    <Link className={`${page.primaryButton} ${styles.submit}`} to="/profile">
      Back to Profile
    </Link>
  ) : (
    <Link className={`${page.primaryButton} ${styles.submit}`} to="/login">
      Sign in
    </Link>
  )

  if (!token) {
    return (
      <AuthLayout>
        <AuthMark />
        <p className={styles.lead}>This link is incomplete. Ask for a new one from Profile → Change email.</p>
        {next}
      </AuthLayout>
    )
  }

  if (!result) {
    return (
      <AuthLayout>
        <AuthMark />
        <p className={styles.lead} role="status">
          Confirming your new email…
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout panel={!result.ok}>
      {result.ok ? (
        <RopiSays variant="friendly" height={120}>
          <strong>Email changed.</strong> From now on, sign in with {result.email}.
        </RopiSays>
      ) : (
        <>
          <AuthMark />
          <p className={page.error} role="alert">
            {FAILED[result.reason]}
          </p>
        </>
      )}
      {next}
    </AuthLayout>
  )
}
