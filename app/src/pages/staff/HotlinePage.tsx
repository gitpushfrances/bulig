import { Trash } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import BackButton from '../../components/BackButton.tsx'
import { BusyContent } from '../../components/Spinner.tsx'
import { formatDate } from '../../data/format.ts'
import { kindLabel } from '../../data/labels.ts'
import { appStaff } from '../../staff/api.ts'
import { hotlinePhone, localPhone } from '../../staff/format.ts'
import { KEYS, useHotlines, useStaffAreas } from '../../staff/hooks.ts'
import { invalidate, update } from '../../staff/snapshot.ts'
import { LOCAL_KINDS, type Hotline, type LocalKind, type StaffArea } from '../../staff/types.ts'
import page from '../Page.module.css'
import { Loaded } from './common.tsx'
import styles from './Staff.module.css'

const MAX_PHONES = 3

// Add or edit a local hotline for a province, city or municipality (EmergencyContactPolicy: staff
// add and edit, only an admin deletes). National lines (911) never show here: admin panel only.
export default function HotlinePage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const areas = useStaffAreas()
  const hotlines = useHotlines()
  return (
    <section className={page.page} aria-labelledby="hotline-title">
      <BackButton fallback="/manage?tab=hotlines" />
      <h1 id="hotline-title" className={page.title}>
        {isNew ? 'Add a hotline' : 'Edit hotline'}
      </h1>
      <Loaded snap={areas} what="areas" rows={2}>
        {(areaList) => (
          <Loaded snap={hotlines} what="hotlines" rows={3}>
            {(list) => {
              const hotline = isNew ? undefined : list.find((h) => h.id === id)
              if (!isNew && !hotline) return <p className={page.hint}>This hotline isn't listed any more.</p>
              return <HotlineForm key={id ?? 'new'} hotline={hotline} areas={areaList} />
            }}
          </Loaded>
        )}
      </Loaded>
    </section>
  )
}

function HotlineForm({ hotline, areas }: { hotline?: Hotline; areas: StaffArea[] }) {
  const navigate = useNavigate()
  const [area, setArea] = useState(hotline?.area ?? '')
  const [kind, setKind] = useState<LocalKind>((hotline?.kind as LocalKind) ?? 'police')
  const [name, setName] = useState(hotline?.name ?? '')
  const [phones, setPhones] = useState<string[]>(hotline?.phones.map(localPhone) ?? [''])
  const [source, setSource] = useState(hotline?.source ?? '')
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState<'save' | 'check' | null>(null)
  const [error, setError] = useState('')

  const done = (h: Hotline | null, notice: string) => {
    if (h) update<Hotline[]>(KEYS.hotlines, (list) => [...list.filter((x) => x.id !== h.id), h])
    invalidate(KEYS.hotlines, KEYS.summary, KEYS.areas)
    navigate('/manage?tab=hotlines', { replace: true, state: { notice } })
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const typed = phones.map((p) => p.trim()).filter(Boolean)
    const cleaned = typed.map(hotlinePhone)
    if (!area) return setError('Pick the area this number covers.')
    if (!name.trim()) return setError('Give it a name, such as "PNP Guiuan".')
    if (!typed.length) return setError('Add at least one number.')
    if (cleaned.some((p) => p === null))
      return setError('A number looks wrong. Use 0917 123 4567, or a short hotline like 166.')
    setBusy('save')
    setError('')
    const r = await appStaff.saveHotline(
      {
        area,
        kind,
        name: name.trim(),
        phones: cleaned as string[],
        source: source.trim() || 'Added by a moderator',
        checkedToday: checked,
      },
      hotline?.id,
    )
    setBusy(null)
    if (!r.ok) return setError(r.message)
    done(r.value, hotline ? 'Saved. Phones get it within an hour.' : 'Hotline added. Phones get it within an hour.')
  }

  const markChecked = async () => {
    if (!hotline) return
    setBusy('check')
    setError('')
    const r = await appStaff.verifyHotline(hotline.id)
    setBusy(null)
    if (!r.ok) return setError(r.message)
    done(null, `${hotline.name} marked checked today.`)
  }

  return (
    <form className={page.form} onSubmit={save} noValidate>
      {hotline && (
        <p className={page.hint}>
          {hotline.hidden
            ? 'Hidden from everyone: not checked for 180 days.'
            : `Last checked ${formatDate(hotline.verifiedAt)}.`}{' '}
          Edits are logged with your name.
        </p>
      )}
      <label className={page.field}>
        <span className={page.fieldLabel}>Covers</span>
        <select className={page.input} value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Pick a province, city or municipality</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.level ?? 'area'})
            </option>
          ))}
        </select>
      </label>
      <label className={page.field}>
        <span className={page.fieldLabel}>Kind</span>
        <select className={page.input} value={kind} onChange={(e) => setKind(e.target.value as LocalKind)}>
          {LOCAL_KINDS.map((k) => (
            <option key={k} value={k}>
              {kindLabel(k)}
            </option>
          ))}
        </select>
      </label>
      <label className={page.field}>
        <span className={page.fieldLabel}>Name</span>
        <input
          className={page.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="MDRRMO Salcedo"
          maxLength={80}
        />
      </label>
      <fieldset className={styles.stack} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className={page.fieldLabel}>Numbers (first is the main one)</legend>
        {phones.map((p, i) => (
          <div key={i} className={styles.phoneRow}>
            <input
              className={page.input}
              inputMode="tel"
              value={p}
              aria-label={`Number ${i + 1}`}
              onChange={(e) => setPhones((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder="0917 123 4567"
            />
            {phones.length > 1 && (
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Remove number ${i + 1}`}
                onClick={() => setPhones((list) => list.filter((_, j) => j !== i))}
              >
                <Trash size={20} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        {phones.length < MAX_PHONES && (
          <button type="button" className={page.secondary} onClick={() => setPhones((list) => [...list, ''])}>
            Another number
          </button>
        )}
      </fieldset>
      <label className={page.field}>
        <span className={page.fieldLabel}>Where you got it</span>
        <input
          className={page.input}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Called the office"
          maxLength={120}
        />
      </label>
      <label className={styles.switchRow}>
        <span>I called it today and it works</span>
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
      </label>
      {error && (
        <p className={page.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={page.primaryButton} disabled={!!busy}>
        <BusyContent busy={busy === 'save'} busyLabel="Saving">
          Save
        </BusyContent>
      </button>
      {hotline && (
        <button type="button" className={page.secondary} onClick={markChecked} disabled={!!busy}>
          <BusyContent busy={busy === 'check'} busyLabel="Saving">
            Mark checked today
          </BusyContent>
        </button>
      )}
      <p className={page.hint}>Only an admin can delete a hotline. 911 and national lines are admin only.</p>
    </form>
  )
}
