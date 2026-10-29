import { ChevronLeft, Save } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { PasswordField, TextField } from '../components/Fields.tsx'
import { useAppData } from '../data/context.ts'
import page from './Page.module.css'
import styles from './Profile.module.css'

const MIN_PASSWORD = 8

// A sub-screen of Profile: Back (to where the person came from), a title, then the content.
export function SubPage({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  const navigate = useNavigate()
  const canGoBack = useLocation().key !== 'default'
  return (
    <section className={styles.page} aria-labelledby="sub-title">
      <button type="button" className={page.back} onClick={() => (canGoBack ? navigate(-1) : navigate('/profile'))}>
        <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        Back
      </button>
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
  const { account, updateProfile } = useAuth()
  const { data } = useAppData()
  const navigate = useNavigate()
  const [name, setName] = useState(account?.name ?? '')
  const [phone, setPhone] = useState(account?.phone ?? '')
  const [homeArea, setHomeArea] = useState(account?.homeArea ?? '')
  const [nameError, setNameError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  if (!account) return null
  const areas = data.status === 'ready' ? [...data.areas].sort((a, b) => a.name.localeCompare(b.name)) : []
  // A Philippine mobile number: 09XX XXX XXXX or +63 9XX XXX XXXX. Optional.
  const checkPhone = (v: string) =>
    !v.trim() || /^(\+?63|0)9\d{9}$/.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a mobile number like 0917 123 4567.'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim() ? '' : 'Enter your name.'
    const p = checkPhone(phone)
    setNameError(n)
    setPhoneError(p)
    if (n || p) return
    updateProfile({ name, phone, homeArea: homeArea || null })
    navigate('/profile')
  }

  return (
    <SubPage title="Edit profile" lead="This stays on this phone until accounts move online.">
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
        <button type="submit" className={page.primaryButton}>
          <Save size={18} strokeWidth={2} aria-hidden="true" />
          Save changes
        </button>
      </form>
    </SubPage>
  )
}

export function ChangePasswordPage() {
  const { isLocal, changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!isLocal) {
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
    const ok = await changePassword(current, next)
    setBusy(false)
    if (!ok) {
      setErrors({ current: "That isn't your current password." })
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
