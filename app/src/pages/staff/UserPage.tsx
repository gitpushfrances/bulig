import { useState } from 'react'
import { useParams } from 'react-router'
import { ROLE_LABELS } from '../../auth/types.ts'
import BackButton from '../../components/BackButton.tsx'
import Dialog from '../../components/Dialog.tsx'
import { BusyContent } from '../../components/Spinner.tsx'
import { formatDate } from '../../data/format.ts'
import { appStaff } from '../../staff/api.ts'
import { initials } from '../../staff/format.ts'
import { KEYS, useStaffUser } from '../../staff/hooks.ts'
import { invalidate, update } from '../../staff/snapshot.ts'
import type { StaffUserDetail } from '../../staff/types.ts'
import page from '../Page.module.css'
import { Loaded } from './common.tsx'
import styles from './Staff.module.css'

// One person, as much as a moderator may do (UserPolicy): switch User ↔ Contributor and take down
// an offensive photo. Suspending, password resets and staff roles stay with admins in the panel.
export default function UserPage() {
  const { id } = useParams()
  const snap = useStaffUser(id)
  return (
    <section className={page.page} aria-labelledby="user-title">
      <BackButton fallback="/manage" />
      <Loaded snap={snap} what="this person" rows={3}>
        {(u) => <Person user={u} />}
      </Loaded>
    </section>
  )
}

function Person({ user }: { user: StaffUserDetail }) {
  const [busy, setBusy] = useState<'role' | 'photo' | 'decline' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [askPhoto, setAskPhoto] = useState(false)
  const staff = user.role === 'moderator' || user.role === 'admin'

  const setRole = async (role: 'user' | 'contributor') => {
    if (role === user.role) return
    setBusy('role')
    setError('')
    const r = await appStaff.setRole(user.id, role)
    setBusy(null)
    if (!r.ok) return setError(r.message)
    update<StaffUserDetail>(KEYS.user(user.id), () => r.value)
    invalidate('users:')
    invalidate(KEYS.summary)
    setNotice(role === 'contributor' ? 'Now a contributor. They can add places.' : 'Now a user.')
  }

  // "Not now" on a Become a contributor request. They see it on that page and may ask again in 30 days.
  const decline = async () => {
    setBusy('decline')
    setError('')
    const r = await appStaff.declineContributor(user.id)
    setBusy(null)
    if (!r.ok) return setError(r.message)
    update<StaffUserDetail>(KEYS.user(user.id), () => r.value)
    invalidate('users:')
    invalidate(KEYS.summary)
    setNotice('Answered: not now. They can ask again in 30 days.')
  }

  const removePhoto = async () => {
    setBusy('photo')
    setError('')
    const r = await appStaff.removePhoto(user.id)
    setBusy(null)
    setAskPhoto(false)
    if (!r.ok) return setError(r.message)
    update<StaffUserDetail>(KEYS.user(user.id), (u) => ({
      ...u,
      photoUrl: null,
    }))
    setNotice('Photo taken down.')
  }

  return (
    <>
      <div className={styles.row}>
        {user.photoUrl ? (
          <img className={styles.thumb} src={user.photoUrl} alt="" />
        ) : (
          <span className={styles.thumb} aria-hidden="true">
            {initials(user.name)}
          </span>
        )}
        <span className={styles.rowText}>
          <h1 id="user-title" className={styles.rowName}>
            {user.name}
          </h1>
          <span className={styles.rowMeta}>
            {ROLE_LABELS[user.role]} · {user.email}
          </span>
        </span>
      </div>
      <p className={page.hint}>
        Member since {formatDate(user.createdAt)} · {user.sent} updates sent · {user.approved} approved
      </p>
      {notice && (
        <p className={styles.status} role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className={page.error} role="alert">
          {error}
        </p>
      )}

      {user.contributorRequest && user.role === 'user' && user.canChangeRole && (
        <div className={page.section}>
          <h2 className={page.sectionTitle}>Asked to be a contributor</h2>
          <div className={styles.request}>
            <dl>
              <div>
                <dt>Asked on</dt>
                <dd>{formatDate(user.contributorRequest.createdAt)}</dd>
              </div>
              <div>
                <dt>Where they travel or know well</dt>
                <dd>{user.contributorRequest.area}</dd>
              </div>
              {user.contributorRequest.reason && (
                <div>
                  <dt>Why</dt>
                  <dd>{user.contributorRequest.reason}</dd>
                </div>
              )}
            </dl>
            <button type="button" className={page.primaryButton} disabled={!!busy} onClick={() => setRole('contributor')}>
              <BusyContent busy={busy === 'role'} busyLabel="Saving">
                Make them a contributor
              </BusyContent>
            </button>
            <button type="button" className={page.secondary} disabled={!!busy} onClick={decline}>
              <BusyContent busy={busy === 'decline'} busyLabel="Saving">
                Not now
              </BusyContent>
            </button>
          </div>
          <p className={page.hint}>Check what they sent before. Say yes to people who know the area and send honest flags.</p>
        </div>
      )}

      {staff || !user.canChangeRole ? (
        <p className={styles.status}>
          Moderators, admins and your own account are changed by an admin, in the web panel.
        </p>
      ) : (
        <div className={page.section}>
          <h2 className={page.sectionTitle}>Role</h2>
          <div className={styles.seg} role="group" aria-label="Role">
            {(['user', 'contributor'] as const).map((r) => (
              <button key={r} type="button" aria-pressed={user.role === r} disabled={!!busy} onClick={() => setRole(r)}>
                {busy === 'role' && user.role !== r ? 'Saving…' : ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          <p className={page.hint}>
            Contributors can add places and send new details. Everything still waits for a moderator.
          </p>
        </div>
      )}

      {user.canRemovePhoto && user.photoUrl && (
        <div className={page.section}>
          <h2 className={page.sectionTitle}>Profile photo</h2>
          <button type="button" className={page.secondary} onClick={() => setAskPhoto(true)} disabled={!!busy}>
            Take down the photo
          </button>
          <p className={page.hint}>For an offensive photo. Suspending and password resets are admin only.</p>
        </div>
      )}

      <Dialog open={askPhoto} title="Take down this photo?" onClose={() => setAskPhoto(false)} busy={busy === 'photo'}>
        <p className={page.lead}>{user.name} will see Ropi's head instead. This is logged with your name.</p>
        <button type="button" className={page.primaryButton} onClick={removePhoto} disabled={!!busy}>
          <BusyContent busy={busy === 'photo'} busyLabel="Taking down">
            Take it down
          </BusyContent>
        </button>
        <button type="button" className={page.secondary} onClick={() => setAskPhoto(false)} disabled={!!busy}>
          Keep it
        </button>
      </Dialog>
    </>
  )
}
