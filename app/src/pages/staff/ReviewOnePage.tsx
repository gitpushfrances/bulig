import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import BackButton from '../../components/BackButton.tsx'
import Dialog from '../../components/Dialog.tsx'
import { BusyContent } from '../../components/Spinner.tsx'
import { useAppData } from '../../data/context.ts'
import { telHref } from '../../data/format.ts'
import { categoryLabel } from '../../data/labels.ts'
import { appStaff } from '../../staff/api.ts'
import { FIELD_LABEL, NEEDED_FOR_NEW, REASON_LABEL, ago, fieldText, isFlag } from '../../staff/format.ts'
import { KEYS, useSubmission } from '../../staff/hooks.ts'
import { invalidate, update } from '../../staff/snapshot.ts'
import {
  REJECT_REASONS,
  type Page,
  type QueueItem,
  type RejectReason,
  type SubmissionDetail,
} from '../../staff/types.ts'
import type { Category } from '../../types.ts'
import page from '../Page.module.css'
import { Loaded } from './common.tsx'
import styles from './Staff.module.css'

// One submission: tick what you can confirm (nothing is ticked for you), then Approve ticked or
// Reject with one of the six fixed reasons. Flags have no fields: Confirm or Reject.
export default function ReviewOnePage() {
  const { id } = useParams()
  const snap = useSubmission(id)
  return (
    <section className={page.page} aria-labelledby="review-one-title">
      <BackButton fallback="/review" />
      <Loaded snap={snap} what="this update" rows={5}>
        {(sub) => <Review key={sub.id} sub={sub} />}
      </Loaded>
    </section>
  )
}

function Review({ sub }: { sub: SubmissionDetail }) {
  const navigate = useNavigate()
  const { data } = useAppData()
  const [ticks, setTicks] = useState<Set<string>>(() => new Set())
  const [photoTicks, setPhotoTicks] = useState<Set<string>>(() => new Set())
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState<RejectReason>('could_not_confirm')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const ready = data.status === 'ready' ? data : null
  const names = {
    category: (c: string) => categoryLabel(c as Category, ready?.labels ?? null),
    area: (a: string) => ready?.areas.find((x) => x.id === a)?.name ?? a,
  }
  const record = sub.recordId ? ready?.services.find((s) => s.id === sub.recordId) : undefined
  const flag = isFlag(sub.reason)
  const isNew = sub.reason === 'new_place'
  const missing = isNew ? NEEDED_FOR_NEW.filter((k) => sub.fields.some((f) => f.key === k) && !ticks.has(k)) : []

  const finish = async (run: () => Promise<{ ok: true } | { ok: false; message: string }>, notice: string) => {
    setBusy(true)
    setError('')
    const result = await run()
    setBusy(false)
    if (!result.ok) return setError(result.message)
    // It leaves the queue on this phone at once; the counts and lists refresh on the next look.
    update<Page<QueueItem>>(KEYS.queue('pending'), (p) => ({
      ...p,
      items: p.items.filter((q) => q.id !== sub.id),
    }))
    invalidate(KEYS.summary, 'queue:', KEYS.submission(sub.id))
    setRejecting(false)
    navigate('/review', { replace: true, state: { notice } })
  }

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  }

  return (
    <>
      <div className={page.section}>
        <p className={page.hint}>
          <span className={`${styles.pill} ${flag ? styles.flag : ''}`}>{REASON_LABEL[sub.reason]}</span>{' '}
          {sub.sender.name} ({sub.sender.role}) · {ago(sub.createdAt)} · seen {sub.seenAt}
        </p>
        <h1 id="review-one-title" className={page.title}>
          {sub.recordName}
        </h1>
        {sub.note && (
          <p className={styles.field}>
            <span>
              <span className={styles.fieldKey}>Their note</span>
              <br />
              {sub.note}
            </span>
          </p>
        )}
      </div>

      {sub.photos.length > 0 && (
        <div className={page.section}>
          <h2 className={page.sectionTitle}>Photos</h2>
          <div className={styles.photos}>
            {sub.photos.map((p, i) => (
              <label key={p.id} style={{ position: 'relative' }}>
                <img
                  className={styles.photo}
                  src={p.url}
                  alt={`Photo ${i + 1} from ${sub.sender.name}`}
                  loading="lazy"
                />
                <span className={styles.photoTag}>{p.source === 'camera' ? 'Camera' : 'Gallery'}</span>
                <span className={styles.radio} style={{ borderBottom: 0 }}>
                  <input
                    type="checkbox"
                    checked={photoTicks.has(p.id)}
                    onChange={() => setPhotoTicks((s) => toggle(s, p.id))}
                  />
                  Add to the place
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {flag ? (
        <div className={page.section}>
          <h2 className={page.sectionTitle}>On record now</h2>
          {record ? (
            <p className={styles.field}>
              <span>
                {record.landmark}
                {record.phone && (
                  <>
                    <br />
                    {record.phone} · checked {record.verifiedAt}
                  </>
                )}
              </span>
            </p>
          ) : (
            <p className={page.hint}>This place isn't in the public list on this phone.</p>
          )}
          {record?.phone && (
            <a className={page.secondary} href={telHref(record.phone)}>
              Call this place
            </a>
          )}
        </div>
      ) : (
        <div className={page.section}>
          <p className={page.hint}>Tick what you can confirm. Nothing is ticked for you.</p>
          {sub.fields.map((f) => (
            <label key={f.key} className={styles.field}>
              <input type="checkbox" checked={ticks.has(f.key)} onChange={() => setTicks((s) => toggle(s, f.key))} />
              <span>
                <span className={styles.fieldKey}>
                  {FIELD_LABEL[f.key] ?? f.key}
                  {isNew && NEEDED_FOR_NEW.includes(f.key) ? ' · needed' : ''}
                </span>
                <br />
                {f.current !== null && <span className={styles.old}>{fieldText(f.key, f.current, names)}</span>}
                {f.current !== null && ' → '}
                <span className={styles.new}>{fieldText(f.key, f.proposed, names)}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      {error && (
        <p className={page.error} role="alert">
          {error}
        </p>
      )}
      {missing.length > 0 && ticks.size > 0 && (
        <p className={page.hint}>A new place needs its name, kind, town and landmark ticked.</p>
      )}

      <div className={styles.bar}>
        <button type="button" className={page.secondary} onClick={() => setRejecting(true)} disabled={busy}>
          Reject
        </button>
        {flag ? (
          <button
            type="button"
            className={page.primaryButton}
            disabled={busy}
            onClick={() => finish(() => appStaff.confirm(sub.id), 'Confirmed. Fix the record in the web panel.')}
          >
            <BusyContent busy={busy} busyLabel="Saving">
              Confirm it
            </BusyContent>
          </button>
        ) : (
          <button
            type="button"
            className={page.primaryButton}
            disabled={busy || ticks.size === 0 || missing.length > 0}
            onClick={() =>
              finish(
                () => appStaff.approve(sub.id, [...ticks], [...photoTicks]),
                'Approved. Phones see it within an hour.',
              )
            }
          >
            <BusyContent busy={busy} busyLabel="Saving">
              Approve ticked ({ticks.size})
            </BusyContent>
          </button>
        )}
      </div>

      <Dialog open={rejecting} title="Why not?" onClose={() => setRejecting(false)} busy={busy}>
        <p className={page.hint}>The sender sees this reason.</p>
        <div role="radiogroup" aria-label="Reason">
          {(Object.keys(REJECT_REASONS) as RejectReason[]).map((r) => (
            <label key={r} className={styles.radio}>
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
              {REJECT_REASONS[r]}
            </label>
          ))}
        </div>
        {error && rejecting && (
          <p className={page.error} role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className={page.primaryButton}
          disabled={busy}
          onClick={() => finish(() => appStaff.reject(sub.id, reason), 'Rejected. The sender sees your reason.')}
        >
          <BusyContent busy={busy} busyLabel="Rejecting">
            Reject
          </BusyContent>
        </button>
      </Dialog>
    </>
  )
}
