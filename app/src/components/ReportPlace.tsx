import { Flag } from '@phosphor-icons/react'
import { useState } from 'react'
import { appContribute, REPORT_REASONS, type ContributeStore, type ReportReason } from '../contribute/store.ts'
import { NOTE_MAX } from '../contribute/draft.ts'
import styles from '../pages/Page.module.css'
import Dialog from './Dialog.tsx'

const FAILED: Record<string, string> = {
  offline: "Couldn't send. Check your signal and try again.",
  busy: "You've sent a lot today. Try again tomorrow.",
  closed: 'Reports are paused for now. Try again later.',
  invalid: "Couldn't send that. Try a shorter note.",
}

// Report wrong info (docs/API.md §7.2): a reason and an optional note go to the moderators, who fix
// the place. Nothing changes in the app until they do. Never on the emergency path.
export default function ReportPlace({
  id,
  name,
  store = appContribute,
}: {
  id: string
  name: string
  store?: ContributeStore
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('closed_for_good')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const send = async () => {
    setBusy(true)
    setError(null)
    const result = await store.reportPlace({ recordId: id, recordName: name, reason, note })
    setBusy(false)
    if (result.ok) {
      setSent(true)
      setOpen(false)
    } else setError(FAILED[result.reason] ?? FAILED.offline)
  }

  return (
    <section className={styles.section} aria-labelledby="report-title">
      <h2 id="report-title" className={styles.sectionTitle}>
        Something wrong?
      </h2>
      {sent ? (
        <p className={styles.hint} role="status">
          Thanks. A moderator will check it. You can follow it in Updates.
        </p>
      ) : (
        <button type="button" className={styles.secondary} onClick={() => setOpen(true)}>
          <Flag size={18} aria-hidden="true" />
          Report wrong info
        </button>
      )}

      <Dialog open={open} title="What's wrong?" onClose={() => setOpen(false)} busy={busy}>
        <div role="radiogroup" aria-label="What's wrong">
          {(Object.keys(REPORT_REASONS) as ReportReason[]).map((r) => (
            <label key={r} className={styles.radio}>
              <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} />
              {REPORT_REASONS[r]}
            </label>
          ))}
        </div>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>What did you see? (optional)</span>
          <textarea
            className={styles.input}
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button type="button" className={styles.primaryButton} disabled={busy} onClick={send}>
          {busy ? 'Sending…' : 'Send report'}
        </button>
      </Dialog>
    </section>
  )
}
