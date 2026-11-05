import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/context.ts'
import { useAppData } from '../data/context.ts'
import BrandPin from './BrandPin.tsx'
import Spinner from './Spinner.tsx'
import styles from './ReadyGate.module.css'

// Right after signing in (and on opening the app signed in), the pages wait until the places and
// your saved list have arrived, instead of drawing half-empty and looking broken (John, 2026-11-05).
// Never longer than GATE_MAX_MS: the free server can take a minute to wake, and after that the
// pages show with their skeletons and fill in. Once ready, it never shows again this session.
// Emergency is never behind it, and the tab bar and the red Emergency button stay on screen.
export const GATE_MAX_MS = 8_000
let passed = false

export default function ReadyGate({ children, pathname }: { children: ReactNode; pathname: string }) {
  const { account, savedStatus } = useAuth()
  const { data, fromBackup } = useAppData()
  const [timedOut, setTimedOut] = useState(false)
  const waiting = !passed && !!account && !timedOut && pathname !== '/emergency' &&
    (data.status === 'loading' || !!fromBackup || savedStatus === 'loading')

  useEffect(() => {
    if (!waiting) return
    const timer = window.setTimeout(() => setTimedOut(true), GATE_MAX_MS)
    return () => window.clearTimeout(timer)
  }, [waiting])
  useEffect(() => {
    // Ready once per sign-in: signing out and in again waits for the new account's list.
    if (!account) passed = false
    else if (!waiting) passed = true
  }, [waiting, account])

  if (!waiting) return children
  return (
    <div className={styles.gate} role="status" aria-live="polite">
      <BrandPin height={72} className={styles.pin} />
      <p className={styles.title}>Getting your places ready</p>
      <p className={styles.note}>
        <Spinner /> {fromBackup ? 'Waking up the Bulig server…' : 'Loading places and your saved list…'}
      </p>
    </div>
  )
}
