import { Check, Clock } from 'lucide-react'
import { describeStatus, openStatus } from '../rules/hours.ts'
import { CHIP_LABELS } from '../rules/needs.ts'
import type { Feature, Service } from '../types.ts'
import styles from '../pages/Page.module.css'

// "Usually open at this time · until 8 PM": green when open, neutral when closed. Never a promise.
export function StatusLine({ service, now }: { service: Service; now: Date }) {
  const status = openStatus(service, now)
  const text = describeStatus(status, now)
  if (!text) return null
  return (
    <p className={`${styles.status} ${status.state === 'open' ? styles.statusOpen : styles.statusClosed}`}>
      <Clock size={14} strokeWidth={2} aria-hidden="true" />
      {text}
    </p>
  )
}

// A place's features: a check when confirmed, "Not confirmed" when unknown, nothing when confirmed
// not offered. Nothing at all for a place with no features recorded.
export function FeatureTags({ service, show }: { service: Service; show: readonly Feature[] }) {
  if (!service.features || !show.length) return null
  const tags = show.filter((f) => service.features?.[f] !== false)
  if (!tags.length) return null
  return (
    <ul className={styles.tags} aria-label="What it offers">
      {tags.map((f) =>
        service.features?.[f] ? (
          <li key={f} className={styles.tagYes}>
            <Check size={14} strokeWidth={2.5} aria-hidden="true" />
            {CHIP_LABELS[f]}
          </li>
        ) : (
          <li key={f} className={styles.tagUnknown}>
            {CHIP_LABELS[f]} · Not confirmed
          </li>
        ),
      )}
    </ul>
  )
}
