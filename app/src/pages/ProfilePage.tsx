import BackButton from '../components/BackButton.tsx'
import { DownloadSimple, EnvelopeSimple, FileText, Globe, HardDrive, Heart, Info, Key, Lifebuoy, MapPin, Palette, Shield, SignOut, Trash, UserGear } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { ROLE_LABELS } from '../auth/types.ts'
import { TextField } from '../components/Fields.tsx'
import Avatar from '../components/Avatar.tsx'
import { SettingsButton, SettingsGroup, SettingsInfo, SettingsLink } from '../components/Settings.tsx'
import { useAppData } from '../data/context.ts'
import { homeAreaText } from '../auth/homeArea.ts'
import { promptInstall, useInstall } from '../install.ts'
import { setTheme, useTheme, type ThemeChoice } from '../theme.ts'
import page from './Page.module.css'
import styles from './Profile.module.css'

const THEMES: { id: ThemeChoice; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

const monthYear = (iso?: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) : null

// Whether the phone lets Bulig use location, in plain words.
function useLocationPermission(): string {
  const [state, setState] = useState('Not asked yet')
  useEffect(() => {
    let status: PermissionStatus | null = null
    const words: Record<PermissionState, string> = { granted: 'Allowed', denied: 'Blocked', prompt: 'Not asked yet' }
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((s) => {
        status = s
        setState(words[s.state])
        s.onchange = () => setState(words[s.state])
      })
      .catch(() => {})
    return () => {
      if (status) status.onchange = null
    }
  }, [])
  return state
}

function DeleteAccount() {
  const { deleteAccount, canManage, accountsOnline } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')

  const [failed, setFailed] = useState(false)

  // Kept out of the way (John, 2026-11-05) but never removed: Google Play and RA 10173 need an
  // in-app delete. A quiet link at the very bottom; the warning and confirm open only on tap.
  if (!canManage) return null
  if (!open) {
    return (
      <button type="button" className={styles.deleteLink} onClick={() => setOpen(true)}>
        Delete account
      </button>
    )
  }

  return (
    <div className={styles.danger}>
      <h2 className={styles.dangerTitle}>Delete account</h2>
      <p className={page.hint}>
        {accountsOnline
          ? 'Deletes your account and saved places from Bulig. This can\u2019t be undone.'
          : 'Removes your account, saved places and details from this phone. This can\u2019t be undone.'}
      </p>
      <TextField
        label='Type "delete" to confirm'
        autoComplete="off"
        autoCapitalize="none"
        value={typed}
        onChange={setTyped}
      />
      {failed && (
        <p className={page.error} role="alert">
          Couldn&apos;t delete your account. Check your connection and try again.
        </p>
      )}
      <div className={page.actions}>
        <button type="button" className={page.secondary} onClick={() => setOpen(false)}>
          Keep my account
        </button>
        <button
          type="button"
          className={`${page.secondary} ${styles.dangerButton}`}
          disabled={typed.trim().toLowerCase() !== 'delete'}
          onClick={async () => {
            setFailed(false)
            if (await deleteAccount()) navigate('/login', { replace: true })
            else setFailed(true)
          }}
        >
          <Trash size={18} aria-hidden="true" />
          Delete account
        </button>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { account, signOut, saved } = useAuth()
  const { data } = useAppData()
  const navigate = useNavigate()
  const { choice } = useTheme()
  const location = useLocationPermission()
  const { canPrompt, installed, ios } = useInstall()
  const [iosSteps, setIosSteps] = useState(false)

  // The route is behind RequireAccount; this keeps TypeScript and a stale render honest.
  if (!account) return null

  const ready = data.status === 'ready'
  const homeArea = homeAreaText(account.homeArea, ready ? data.areas : [])
  const since = monthYear(account.createdAt)

  return (
    <section className={styles.page} aria-labelledby="profile-title">
      <BackButton fallback="/" />
      <h1 id="profile-title" className={page.title}>
        Profile
      </h1>

      <div className={styles.header}>
        <Avatar size={64} />
        <div className={styles.who}>
          <h2 className={styles.name}>{account.name}</h2>
          <p className={styles.email}>{account.email}</p>
          <p className={styles.badges}>
            <span className={styles.role}>{ROLE_LABELS[account.role]}</span>
            {since && <span>Member since {since}</span>}
          </p>
        </div>
      </div>

      <SettingsGroup title="Account">
        <SettingsLink to="/profile/edit" icon={UserGear} label="Edit profile" />
        <SettingsLink to="/profile/password" icon={Key} label="Change password" />
        <SettingsLink
          to="/profile/email"
          icon={EnvelopeSimple}
          label="Change email"
          value={account.pendingEmail ? 'Waiting for link' : undefined}
        />
        <SettingsLink to="/saved" icon={Heart} label="Saved places" value={saved.length} />
        {homeArea && <SettingsInfo icon={MapPin} label="Home area" value={homeArea} />}
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <SettingsInfo icon={Palette} label="Appearance">
          <div className={styles.switch} role="group" aria-label="Appearance">
            {THEMES.map((t) => (
              <button key={t.id} type="button" aria-pressed={choice === t.id} onClick={() => setTheme(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </SettingsInfo>
        <SettingsInfo icon={Globe} label="Language" value="English" />
        <SettingsInfo icon={MapPin} label="Location" value={location} />
      </SettingsGroup>

      <SettingsGroup title="App">
        {!installed &&
          (canPrompt ? (
            <SettingsButton icon={DownloadSimple} label="Install Bulig" value="Full screen" onClick={() => promptInstall()} />
          ) : (
            <SettingsButton
              icon={DownloadSimple}
              label="Install Bulig"
              value={iosSteps ? 'Hide' : 'How'}
              onClick={() => setIosSteps((s) => !s)}
            />
          ))}
        {!installed && iosSteps && (
          <li>
            <ol className={styles.steps}>
              {ios ? (
                <>
                  <li>Tap Share at the bottom of Safari.</li>
                  <li>Tap Add to Home Screen.</li>
                  <li>Open Bulig from your home screen: it runs full screen.</li>
                </>
              ) : (
                <>
                  <li>Open your browser&apos;s menu (⋮).</li>
                  <li>Tap Install app or Add to Home screen.</li>
                  <li>Open Bulig from your home screen: it runs full screen.</li>
                </>
              )}
            </ol>
          </li>
        )}
        <SettingsInfo
          icon={HardDrive}
          label="Offline data"
          value={ready ? `${data.services.length} places · ${data.emergency.length} numbers` : 'Loading…'}
        />
      </SettingsGroup>

      <SettingsGroup title="Support and legal">
        <SettingsLink to="/help" icon={Lifebuoy} label="Help and FAQ" />
        <SettingsLink to="/about" icon={Info} label="About Bulig" />
        <SettingsLink to="/terms" icon={FileText} label="Terms of Use" />
        <SettingsLink to="/privacy" icon={Shield} label="Privacy Policy" />
      </SettingsGroup>

      <button
        type="button"
        className={page.secondary}
        onClick={() => {
          signOut()
          navigate('/login', { replace: true })
        }}
      >
        <SignOut size={18} aria-hidden="true" />
        Sign out
      </button>

      <footer className={styles.footer}>
        <p>
          Bulig v{__APP_VERSION__} · build {__BUILD_ID__}
        </p>
        <p>Made for travellers in the Philippines.</p>
      </footer>

      <DeleteAccount />
    </section>
  )
}
