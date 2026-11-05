import { CheckCircle, Clock, PlusCircle, XCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { SubPage } from './AccountPages.tsx'
import { RowsSkeleton } from '../components/Skeleton.tsx'
import type { MySubmission, SubmissionStatus } from '../contribute/store.ts'
import { markAllSeen, STATUS_TEXT, statusDetail } from '../contribute/updates.ts'
import { useMyUpdates } from '../contribute/useMyUpdates.ts'
import page from './Page.module.css'
import styles from './Updates.module.css'

// The bell's page and Profile → My updates: what the person sent and what moderators said, newest
// first. Opening it marks every answer as seen.

type Filter = 'all' | 'pending' | 'approved' | 'rejected'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Waiting' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Not added' },
]

const REASON_TEXT: Record<string, string> = {
  new_place: 'New place',
  changed: 'Changed details',
  number_not_working: 'Number not working',
  closed_for_good: 'Closed for good',
  wrong_location: 'Wrong location',
  duplicate: 'Duplicate',
  other: 'Something else',
}

const ICONS: Record<SubmissionStatus, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle,
  partly_approved: CheckCircle,
  rejected: XCircle,
}

const matches = (s: MySubmission, f: Filter) =>
  f === 'all' || (f === 'approved' ? s.status === 'approved' || s.status === 'partly_approved' : s.status === f)

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

export default function UpdatesPage() {
  const { account } = useAuth()
  const { allowed, items, failed, unread, reload } = useMyUpdates()
  const [filter, setFilter] = useState<Filter>('all')

  // Answers stay highlighted while the page is open; they count as seen once the person leaves.
  useEffect(() => {
    if (!account || !items) return
    return () => markAllSeen(account.email, items)
  }, [items, account])

  if (!account) return null
  if (!allowed) return <Navigate to="/" replace />

  const shown = (items ?? []).filter((s) => matches(s, filter))

  return (
    <SubPage title="My updates" lead="What you sent, and what a moderator said.">
      <div className={styles.filters} role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} className={styles.filter} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {!items && !failed && <RowsSkeleton />}
      {!items && failed && (
        <div className={page.empty}>
          <p>Couldn&apos;t load your updates. The server may be waking up; this can take a minute.</p>
          <button type="button" className={page.secondary} onClick={() => void reload()}>
            Try again
          </button>
        </div>
      )}
      {items && shown.length === 0 && (
        <div className={page.empty}>
          <p>{items.length ? 'Nothing here.' : 'Nothing sent yet.'}</p>
          <Link to="/add" className={page.primaryButton}>
            <PlusCircle size={20} aria-hidden="true" />
            Add a place
          </Link>
        </div>
      )}
      {shown.length > 0 && (
        <ul className={styles.list}>
          {shown.map((s) => {
            const Icon = ICONS[s.status]
            return (
              <li key={s.id} className={`${styles.item} ${unread.includes(s.id) ? styles.fresh : ''}`}>
                <Icon size={24} weight="fill" className={styles[s.status]} aria-hidden="true" />
                <div className={styles.body}>
                  <p className={styles.name}>{s.recordName}</p>
                  <p className={styles.meta}>
                    {REASON_TEXT[s.reason] ?? s.reason} · sent {when(s.createdAt)}
                  </p>
                  <p className={styles.detail}>{statusDetail(s)}</p>
                </div>
                <span className={`${styles.pill} ${styles[`pill_${s.status}`]}`}>{STATUS_TEXT[s.status]}</span>
              </li>
            )
          })}
        </ul>
      )}
    </SubPage>
  )
}
