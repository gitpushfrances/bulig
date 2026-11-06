import { useState } from 'react'
import { useLocation } from 'react-router'
import { isFlag } from '../../staff/format.ts'
import { useQueue } from '../../staff/hooks.ts'
import type { QueueItem } from '../../staff/types.ts'
import page from '../Page.module.css'
import { Loaded } from './common.tsx'
import { QueueRow } from './StaffHomePage.tsx'
import styles from './Staff.module.css'

const FILTERS: {
  id: string
  label: string
  test: (q: QueueItem) => boolean
}[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'new', label: 'New place', test: (q) => q.reason === 'new_place' },
  { id: 'changed', label: 'Changed', test: (q) => q.reason === 'changed' },
  { id: 'flags', label: 'Flags', test: (q) => isFlag(q.reason) },
]

// The review queue, oldest first (API.md §7.8). The chips filter the copy already on the phone, so
// switching them never waits for the server.
export default function ReviewPage() {
  const queue = useQueue('pending')
  const [filter, setFilter] = useState('all')
  const notice = (useLocation().state as { notice?: string } | null)?.notice
  const test = FILTERS.find((f) => f.id === filter)?.test ?? (() => true)

  return (
    <section className={page.page} aria-labelledby="review-title">
      <h1 id="review-title" className={page.title}>
        Review
      </h1>
      {notice && (
        <p className={styles.status} role="status">
          {notice}
        </p>
      )}
      <div className={styles.chips} role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={page.filterChip}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <Loaded snap={queue} what="the queue" rows={4}>
        {({ items }) => {
          const shown = items.filter(test)
          return shown.length ? (
            <>
              <p className={page.hint}>Oldest first. Your own updates are greyed out: someone else reviews them.</p>
              <ul className={styles.list}>
                {shown.map((q) => (
                  <li key={q.id}>
                    <QueueRow item={q} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={page.hint}>Nothing waiting here.</p>
          )
        }}
      </Loaded>
    </section>
  )
}
