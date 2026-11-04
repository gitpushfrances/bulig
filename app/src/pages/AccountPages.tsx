import { Camera, Check, FloppyDisk, Trash } from '@phosphor-icons/react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { toAvatar } from '../auth/photo.ts'
import BackButton from '../components/BackButton.tsx'
import { BusyContent } from '../components/Spinner.tsx'
import { PasswordField, TextField } from '../components/Fields.tsx'
import { useAppData } from '../data/context.ts'
import { HOME_AREA_MAX, homeAreaText } from '../auth/homeArea.ts'
import page from './Page.module.css'
import styles from './Profile.module.css'

export const MIN_PASSWORD = 8

// A sub-screen of Profile: Back (to where the person came from), a title, then the content.
export function SubPage({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className={styles.page} aria-labelledby="sub-title">
      <BackButton fallback="/profile" />
      <div className={page.intro}>
        <h1 id="sub-title" className={page.title}>
          {title}
        </h1>
        {lead && <p className={page.lead}>{lead}</p>}
      </div>
      {children}
    </section>
  )
}

type PhotoStep =
  | { kind: 'idle' }
  | { kind: 'preview'; photo: string } // picked, waiting for "Use this photo"
  | { kind: 'remove' } // waiting for "Remove photo"

export function EditProfilePage() {
  const { account, updateProfile, accountsOnline } = useAuth()
  const { data } = useAppData()
  const navigate = useNavigate()
  const areas = data.status === 'ready' ? data.areas : []
  const [name, setName] = useState(account?.name ?? '')
  const [phone, setPhone] = useState(account?.phone ?? '')
  // null until the person types: the saved value then shows even if the area list loads late.
  const [homeEdit, setHomeEdit] = useState<string | null>(null)
  const [photoStep, setPhotoStep] = useState<PhotoStep>({ kind: 'idle' })
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoNote, setPhotoNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [nameError, setNameError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [homeError, setHomeError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!account) return null
  const photo = account.photo
  const homeArea = homeEdit ?? homeAreaText(account.homeArea, areas)
  // A Philippine mobile number: 09XX XXX XXXX or +63 9XX XXX XXXX. Optional.
  const checkPhone = (v: string) =>
    !v.trim() || /^(\+?63|0)9\d{9}$/.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a mobile number like 0917 123 4567.'
  const checkHome = (v: string) => (v.trim().length > HOME_AREA_MAX ? `Keep it under ${HOME_AREA_MAX} characters.` : '')

  // The photo saves on its own, right after the person confirms it, with the details already saved
  // (not the ones being edited below).
  const savePhoto = async (next: string | undefined) => {
    setPhotoBusy(true)
    setPhotoNote(null)
    const result = await updateProfile({
      name: account.name,
      phone: account.phone,
      homeArea: account.homeArea ?? null,
      photo: next,
    })
    setPhotoBusy(false)
    if (result === 'ok') {
      setPhotoStep({ kind: 'idle' })
      setPhotoNote({ ok: true, text: next ? 'Photo updated.' : 'Photo removed.' })
      return
    }
    const reason = typeof result === 'object' ? result.photo : result
    setPhotoNote({
      ok: false,
      text:
        reason === 'offline'
          ? "Couldn't reach Bulig. Check your connection and try again."
          : reason === 'invalid'
            ? "Bulig couldn't use that photo. Try another one."
            : reason === 'busy'
              ? 'You changed your photo many times today. Try again tomorrow.'
              : "Photos can't be saved right now. Try again later.",
    })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim() ? '' : 'Enter your name.'
    const p = checkPhone(phone)
    const h = checkHome(homeArea)
    setNameError(n)
    setPhoneError(p)
    setHomeError(h)
    setSaveError('')
    if (n || p || h) return
    setSaving(true)
    const result = await updateProfile({ name, phone, homeArea: homeArea.trim() || null, photo })
    setSaving(false)
    if (result === 'ok' || typeof result === 'object') navigate('/profile')
    else
      setSaveError(
        result === 'offline'
          ? "Couldn't reach Bulig. Check your connection and try again."
          : 'Bulig couldn\u2019t save that. Check your name, phone number and home area.',
      )
  }

  const pickPhoto = (
    <label className={page.secondary}>
      <Camera size={18} aria-hidden="true" />
      {photoStep.kind === 'preview' ? 'Choose another' : photo ? 'Change photo' : 'Add a photo'}
      <input
        type="file"
        accept="image/*"
        className="visually-hidden"
        disabled={photoBusy}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          try {
            setPhotoStep({ kind: 'preview', photo: await toAvatar(file) })
            setPhotoNote(null)
          } catch {
            setPhotoNote({ ok: false, text: "That file couldn't be opened as a picture. Try a JPG or PNG." })
          }
        }}
      />
    </label>
  )

  return (
    <SubPage
      title="Edit profile"
      lead={accountsOnline ? 'Saved to your account, so it follows you to any phone.' : 'This stays on this phone until accounts move online.'}
    >
      {photoStep.kind === 'preview' ? (
        <section className={styles.photoConfirm} aria-labelledby="photo-confirm-title">
          <h2 id="photo-confirm-title" className={styles.photoConfirmTitle}>
            Use this photo?
          </h2>
          <span className={styles.photoBig}>
            <img src={photoStep.photo} alt="Your new profile photo" className={styles.photoImg} />
          </span>
          <p className={page.hint}>It shows on Home and your Profile.</p>
          <div className={styles.photoConfirmActions}>
            <button
              type="button"
              className={page.primaryButton}
              disabled={photoBusy}
              aria-busy={photoBusy}
              onClick={() => savePhoto(photoStep.photo)}
            >
              <BusyContent busy={photoBusy} busyLabel="Saving your photo…">
                <Check size={18} aria-hidden="true" />
                Use this photo
              </BusyContent>
            </button>
            {pickPhoto}
            <button type="button" className={page.secondary} disabled={photoBusy} onClick={() => setPhotoStep({ kind: 'idle' })}>
              Cancel
            </button>
          </div>
          {photoNote && !photoNote.ok && (
            <p className={page.error} role="alert">
              {photoNote.text}
            </p>
          )}
        </section>
      ) : (
        <div className={styles.photoRow}>
          <span className={styles.photoPreview} aria-hidden="true">
            <img src={photo ?? '/assets/mascot/ropi-head.webp'} alt="" className={photo ? styles.photoImg : styles.photoRopi} />
          </span>
          <div className={styles.photoActions}>
            {photoStep.kind === 'remove' ? (
              <>
                <p className={page.hint}>Remove your photo? Your initials show instead.</p>
                <button
                  type="button"
                  className={page.primaryButton}
                  disabled={photoBusy}
                  aria-busy={photoBusy}
                  onClick={() => savePhoto(undefined)}
                >
                  <BusyContent busy={photoBusy} busyLabel="Removing your photo…">
                    Remove photo
                  </BusyContent>
                </button>
                <button type="button" className={page.secondary} disabled={photoBusy} onClick={() => setPhotoStep({ kind: 'idle' })}>
                  Keep it
                </button>
              </>
            ) : (
              <>
                {pickPhoto}
                {photo && (
                  <button type="button" className={page.secondary} onClick={() => setPhotoStep({ kind: 'remove' })}>
                    <Trash size={18} aria-hidden="true" />
                    Remove
                  </button>
                )}
                {!photoNote && (
                  <p className={page.hint}>
                    {photo ? 'Shown on Home and your Profile.' : 'Until you add one, Ropi stands in on Profile and your initials on Home.'}
                  </p>
                )}
              </>
            )}
            {photoNote && (
              <p className={photoNote.ok ? styles.done : page.error} role={photoNote.ok ? 'status' : 'alert'}>
                {photoNote.text}
              </p>
            )}
          </div>
        </div>
      )}

      <form className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="Name"
          autoComplete="name"
          value={name}
          error={nameError}
          onChange={(v) => {
            setName(v)
            setNameError('')
          }}
        />
        <TextField
          label="Email"
          type="email"
          value={account.email}
          readOnly
          hint="To change it, use Change email on your Profile."
          onChange={() => {}}
        />
        <TextField
          label="Mobile number (optional)"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          error={phoneError}
          onChange={(v) => {
            setPhone(v)
            setPhoneError('')
          }}
          onBlur={() => setPhoneError(checkPhone(phone))}
        />
        {/* Free text, so any barangay or town works, listed in Bulig or not. The listed areas are
            only suggestions. Town level on purpose: no house address (Data Privacy Act). */}
        <TextField
          label="Home area (optional)"
          autoComplete="off"
          list="home-area-suggestions"
          placeholder="e.g. Surok, Guiuan, Eastern Samar"
          maxLength={HOME_AREA_MAX}
          value={homeArea}
          error={homeError}
          hint="Your barangay and town are enough. Don't enter your house address."
          onChange={(v) => {
            setHomeEdit(v)
            setHomeError('')
          }}
        />
        <datalist id="home-area-suggestions">
          {areas.map((a) => (
            <option key={a.id} value={`${a.name}, ${a.region}`} />
          ))}
        </datalist>
        {saveError && (
          <p className={page.error} role="alert">
            {saveError}
          </p>
        )}
        <button type="submit" className={page.primaryButton} disabled={saving} aria-busy={saving}>
          <BusyContent busy={saving} busyLabel="Saving…">
            <FloppyDisk size={18} aria-hidden="true" />
            Save changes
          </BusyContent>
        </button>
      </form>
    </SubPage>
  )
}

export function ChangePasswordPage() {
  const { canManage, changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!canManage) {
    return (
      <SubPage title="Change password">
        <p className={styles.draft}>Test accounts keep the password &quot;password&quot;. Accounts you create can change theirs here.</p>
      </SubPage>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = {
      current: current ? '' : 'Enter your current password.',
      next: next.length >= MIN_PASSWORD ? '' : `Use at least ${MIN_PASSWORD} characters.`,
      confirm: confirm === next ? '' : "The passwords don't match.",
    }
    setErrors(found)
    setDone(false)
    if (Object.values(found).some(Boolean)) return
    setBusy(true)
    const result = await changePassword(current, next)
    setBusy(false)
    if (result !== 'ok') {
      setErrors({
        current:
          result === 'offline' ? "Couldn't reach Bulig. Check your connection and try again." : "That isn't your current password.",
      })
      return
    }
    setCurrent('')
    setNext('')
    setConfirm('')
    setDone(true)
  }

  return (
    <SubPage title="Change password">
      <form className={styles.form} onSubmit={submit} noValidate>
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          value={current}
          error={errors.current}
          onChange={(v) => {
            setCurrent(v)
            setErrors((e) => ({ ...e, current: '' }))
          }}
        />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
          value={next}
          error={errors.next}
          onChange={(v) => {
            setNext(v)
            setErrors((e) => ({ ...e, next: '' }))
          }}
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          error={errors.confirm}
          onChange={(v) => {
            setConfirm(v)
            setErrors((e) => ({ ...e, confirm: '' }))
          }}
        />
        {done && (
          <p className={styles.done} role="status">
            Password changed.
          </p>
        )}
        <button type="submit" className={page.primaryButton} disabled={busy} aria-busy={busy}>
          <BusyContent busy={busy} busyLabel="Changing your password…">
            Change password
          </BusyContent>
        </button>
      </form>
    </SubPage>
  )
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// API.md §5.7. Nothing changes until the link sent to the new address is opened, so a typo can't lock
// anyone out. The current password stops a phone left signed in from being used to take the account.
export function ChangeEmailPage() {
  const { account, accountsOnline, requestEmailChange, cancelEmailChange } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)

  if (!account) return null

  if (!accountsOnline) {
    return (
      <SubPage title="Change email">
        <p className={styles.draft}>Accounts kept on this phone can&apos;t change their email. Accounts on Bulig&apos;s server can.</p>
      </SubPage>
    )
  }

  const pending = account.pendingEmail

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = {
      email: EMAIL_PATTERN.test(email.trim()) ? '' : 'Enter an email like name@example.com.',
      password: password ? '' : 'Enter your current password.',
    }
    setErrors(found)
    if (found.email || found.password) return
    setBusy(true)
    const result = await requestEmailChange(email, password)
    setBusy(false)
    if (result.ok) {
      setEmail('')
      setPassword('')
      return
    }
    const words: Record<typeof result.reason, { email?: string; password?: string; form?: string }> = {
      same: { email: "That's already your email." },
      taken: { email: 'That email already has an account.' },
      invalid: { email: 'Enter an email like name@example.com.' },
      wrong: { password: "That isn't your current password." },
      busy: { form: 'Too many tries. Wait an hour and try again.' },
      offline: { form: "Couldn't reach Bulig. Check your connection and try again." },
      preview: { form: "This version of Bulig can't send emails." },
      unavailable: { form: "Bulig couldn't send the link right now. Try again later." },
    }
    setErrors(words[result.reason])
  }

  const cancel = async () => {
    setBusy(true)
    const ok = await cancelEmailChange()
    setBusy(false)
    setErrors(ok ? {} : { form: "Couldn't reach Bulig. Check your connection and try again." })
  }

  return (
    <SubPage title="Change email" lead={`You sign in with ${account.email}.`}>
      {pending && (
        <div className={styles.form}>
          <p className={page.lead} role="status">
            We sent a link to <strong>{pending}</strong>. Open it within an hour to finish. Until then you still sign in with{' '}
            {account.email}.
          </p>
          <button type="button" className={page.secondary} onClick={cancel} disabled={busy}>
            Cancel the change
          </button>
        </div>
      )}
      <form className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label={pending ? 'Use a different new email' : 'New email'}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          error={errors.email}
          onChange={(v) => {
            setEmail(v)
            setErrors((e) => ({ ...e, email: '', form: '' }))
          }}
        />
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          hint="So nobody else can change it from your phone."
          value={password}
          error={errors.password}
          onChange={(v) => {
            setPassword(v)
            setErrors((e) => ({ ...e, password: '', form: '' }))
          }}
        />
        {errors.form && (
          <p className={page.error} role="alert">
            {errors.form}
          </p>
        )}
        <button type="submit" className={page.primaryButton} disabled={busy} aria-busy={busy}>
          <BusyContent busy={busy} busyLabel="Sending…">
            Send the link
          </BusyContent>
        </button>
      </form>
    </SubPage>
  )
}
