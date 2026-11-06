import { Link } from 'react-router'
import { useAuth } from '../../auth/context.ts'
import { ROLE_LABELS } from '../../auth/types.ts'
import { appStaff } from '../../staff/api.ts'
import { REASON_LABEL, ago, initials, isFlag } from '../../staff/format.ts'
import { KEYS, useQueue, useSummary } from '../../staff/hooks.ts'
import { prefetch } from '../../staff/snapshot.ts'
import type { QueueItem } from '../../staff/types.ts'
import page from '../Page.module.css'
import { Loaded } from './common.tsx'
import styles from './Staff.module.css'

// The moderator's Home (John, 2026-11-06): counts, what is waiting, and what was approved lately.
// Every tile opens the screen it counts. 911 is in the bar above (Layout).
export default function StaffHomePage() {
  const { account } = useAuth()
  const summary = useSummary()
  const waiting = useQueue('pending')
  const approved = useQueue('approved')
  const firstName = account?.name.trim().split(/\s+/)[0]
  const scope = account && account.areas.length > 0 ? `${account.areas.length} areas` : 'whole country'

  return (
    <section className={page.page} aria-labelledby="staff-home-title">
      <h1 id="staff-home-title" className={page.title}>
        {firstName ? `Hi, ${firstName}!` : 'Hi there!'}
      </h1>
      <p className={styles.eyebrow}>
        {account ? ROLE_LABELS[account.role] : ''} · {scope}
      </p>

      <Loaded snap={summary} what="the counts" rows={2}>
        {(s) => (
          <div className={styles.stats}>
            <Link to="/review" className={`${styles.stat} ${styles.hot}`}>
              <strong>{s.pendingSubmissions}</strong>Waiting to review
            </Link>
            <Link to="/map" className={styles.stat}>
              <strong>{s.places}</strong>Places listed
            </Link>
            <Link
              to="/manage?tab=hotlines&show=due"
              className={`${styles.stat} ${s.hiddenEmergencyContacts ? styles.warn : ''}`}
            >
              <strong>{s.dueEmergencyContacts + s.hiddenEmergencyContacts}</strong>
              Hotlines to check
            </Link>
            <Link to="/manage" className={styles.stat}>
              <strong>{s.users}</strong>Users
            </Link>
          </div>
        )}
      </Loaded>

      <div className={page.section}>
        <div className={page.sectionHead}>
          <h2 className={page.sectionTitle}>Waiting</h2>
          <Link to="/review" className={page.more}>
            See all
          </Link>
        </div>
        <Loaded snap={waiting} what="the queue">
          {({ items }) => {
            const mine = items.filter((q) => q.canReview).slice(0, 3)
            return mine.length ? (
              <ul className={styles.list}>
                {mine.map((q) => (
                  <li key={q.id}>
                    <QueueRow item={q} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={page.hint}>Nothing waiting. Nice.</p>
            )
          }}
        </Loaded>
      </div>

      <div className={page.section}>
        <h2 className={page.sectionTitle}>Recently approved</h2>
        <Loaded snap={approved} what="recent approvals" rows={2}>
          {({ items }) =>
            items.length ? (
              <ul className={styles.list}>
                {items.slice(0, 3).map((q) => (
                  <li key={q.id}>
                    <div className={styles.row}>
                      <span className={styles.thumb} aria-hidden="true">
                        {initials(q.recordName)}
                      </span>
                      <span className={styles.rowText}>
                        <span className={styles.rowName}>{q.recordName}</span>
                        <span className={styles.rowMeta}>
                          {REASON_LABEL[q.reason]} · {ago(q.createdAt)}
                        </span>
                      </span>
                      <span className={`${styles.pill} ${styles.ok}`}>Approved</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={page.hint}>Nothing approved yet.</p>
            )
          }
        </Loaded>
        <p className={page.hint}>Changes reach phones within an hour.</p>
      </div>
    </section>
  )
}

// One queue row. Pressing it starts loading the review screen, so it opens already drawn.
export function QueueRow({ item }: { item: QueueItem }) {
  const meta = item.canReview
    ? `${item.sender.name} · ${ago(item.createdAt)} · ${item.photoCount} photo${item.photoCount === 1 ? '' : 's'}`
    : item.status === 'pending'
      ? 'Your update. Someone else reviews it.'
      : ago(item.createdAt)
  const body = (
    <>
      <span className={styles.thumb} aria-hidden="true">
        {initials(item.recordName)}
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowName}>{item.recordName}</span>
        <span className={styles.rowMeta}>{meta}</span>
      </span>
      <span className={`${styles.pill} ${isFlag(item.reason) ? styles.flag : ''}`}>{REASON_LABEL[item.reason]}</span>
    </>
  )
  if (!item.canReview)
    return (
      <div className={styles.row} aria-disabled="true">
        {body}
      </div>
    )
  return (
    <Link
      to={`/review/${encodeURIComponent(item.id)}`}
      className={styles.row}
      onPointerDown={() => prefetch(KEYS.submission(item.id), () => appStaff.submission(item.id), 5 * 60_000)}
    >
      {body}
    </Link>
  )
}
