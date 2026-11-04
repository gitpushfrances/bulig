import { Camera, FloppyDisk, Trash } from '@phosphor-icons/react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { toAvatar } from '../auth/photo.ts'
import BackButton from '../components/BackButton.tsx'
import { PasswordField, TextField } from '../components/Fields.tsx'
import { useAppData } from '../data/context.ts'
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

export function EditProfilePage() {
  const { account, updateProfile, accountsOnline } = useAuth()
  const { data } = useAppData()
  const navigate = useNavigate()
  const [name, setName] = useState(account?.name ?? '')
  const [phone, setPhone] = useState(account?.phone ?? '')
  const [homeArea, setHomeArea] = useState(account?.homeArea ?? '')
  const [photo, setPhoto] = useState(account?.photo)
  const [photoError, setPhotoError] = useState('')
  const [nameError, setNameError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!account) return null
  const areas = data.status === 'ready' ? [...data.areas].sort((a, b) => a.name.localeCompare(b.name)) : []
  // A Philippine mobile number: 09XX XXX XXXX or +63 9XX XXX XXXX. Optional.
  const checkPhone = (v: string) =>
    !v.trim() || /^(\+?63|0)9\d{9}$/.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a mobile number like 0917 123 4567.'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim() ? '' : 'Enter your name.'
    const p = checkPhone(phone)
    setNameError(n)
    setPhoneError(p)
    setSaveError('')
    if (n || p) return
    setSaving(true)
    const result = await updateProfile({ name, phone, homeArea: homeArea || null, photo })
    setSaving(false)
    if (result === 'ok') navigate('/profile')
    else if (typeof result === 'object')
      // The details saved; only the photo didn't.
      setSaveError(
        result.photo === 'offline'
          ? "Your details are saved, but the photo didn't upload. Check your connection and save again."
          : result.photo === 'invalid'
            ? "Your details are saved, but Bulig couldn't use that photo. Try another one."
            : result.photo === 'busy'
              ? 'Your details are saved. You changed your photo many times today; try again tomorrow.'
              : "Your details are saved. Photos can't be uploaded right now; try again later.",
      )
    else
      setSaveError(
        result === 'offline'
          ? "Couldn't reach Bulig. Check your connection and try again."
          : 'Bulig couldn\u2019t save that. Check your name and phone number.',
      )
  }

  return (
    <SubPage
      title="Edit profile"
      lead={accountsOnline ? 'Saved to your account, so it follows you to any phone.' : 'This stays on this phone until accounts move online.'}
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.photoRow}>
          <span className={styles.photoPreview} aria-hidden="true">
            <img src={photo ?? '/assets/mascot/ropi-head.webp'} alt="" className={photo ? styles.photoImg : styles.photoRopi} />
          </span>
          <div className={styles.photoActions}>
            <label className={page.secondary}>
              <Camera size={18} aria-hidden="true" />
              {photo ? 'Change photo' : 'Add a photo'}
              <input
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  try {
                    setPhoto(await toAvatar(file))
                    setPhotoError('')
                  } catch {
                    setPhotoError("That file couldn't be opened as a picture. Try a JPG or PNG.")
                  }
                }}
              />
            </label>
            {photo && (
              <button type="button" className={page.secondary} onClick={() => setPhoto(undefined)}>
                <Trash size={18} aria-hidden="true" />
                Remove
              </button>
            )}
            <p className={page.hint}>{photo ? 'Shown on Home and your Profile.' : 'Until you add one, Ropi stands in on Profile and your initials on Home.'}</p>
            {photoError && <p className={page.error}>{photoError}</p>}
          </div>
        </div>
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
        <TextField label="Email" type="email" value={account.email} readOnly hint="Your email can't be changed yet." onChange={() => {}} />
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
        <div className={page.field}>
          <label htmlFor="home-area" className={page.fieldLabel}>
            Home area (optional)
          </label>
          <select id="home-area" className={styles.select} value={homeArea} onChange={(e) => setHomeArea(e.target.value)}>
            <option value="">None</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}, {a.region}
              </option>
            ))}
          </select>
        </div>
        {saveError && (
          <p className={page.error} role="alert">
            {saveError}
          </p>
        )}
        <button type="submit" className={page.primaryButton} disabled={saving}>
          <FloppyDisk size={18} aria-hidden="true" />
          {saving ? 'Saving…' : 'Save changes'}
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
        <button type="submit" className={page.primaryButton} disabled={busy}>
          Change password
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
        <button type="submit" className={page.primaryButton} disabled={busy}>
          Send the link
        </button>
      </form>
    </SubPage>
  )
}
