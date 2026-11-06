import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import BackButton from '../../components/BackButton.tsx'
import { BusyContent } from '../../components/Spinner.tsx'
import { appStaff } from '../../staff/api.ts'
import { KEYS, useStaffAreas } from '../../staff/hooks.ts'
import { invalidate, update } from '../../staff/snapshot.ts'
import { AREA_LEVELS, type AreaLevel, type StaffArea } from '../../staff/types.ts'
import page from '../Page.module.css'
import { Loaded } from './common.tsx'

// Add or edit an area (AreaPolicy: staff add and edit; only an admin deletes, in the panel).
export default function AreaPage() {
  const { id } = useParams()
  const areas = useStaffAreas()
  const isNew = !id || id === 'new'
  return (
    <section className={page.page} aria-labelledby="area-title">
      <BackButton fallback="/manage?tab=areas" />
      <h1 id="area-title" className={page.title}>
        {isNew ? 'Add an area' : 'Edit area'}
      </h1>
      <Loaded snap={areas} what="areas" rows={3}>
        {(list) => {
          const area = isNew ? undefined : list.find((a) => a.id === id)
          if (!isNew && !area) return <p className={page.hint}>This area isn't listed any more.</p>
          return <AreaForm key={id ?? 'new'} area={area} areas={list} />
        }}
      </Loaded>
    </section>
  )
}

function AreaForm({ area, areas }: { area?: StaffArea; areas: StaffArea[] }) {
  const navigate = useNavigate()
  const [name, setName] = useState(area?.name ?? '')
  const [level, setLevel] = useState<AreaLevel>((area?.level as AreaLevel) ?? 'municipality')
  const [parent, setParent] = useState(area?.parent ?? '')
  const [region, setRegion] = useState(area?.region ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // An area can sit only inside a bigger one, and never inside itself.
  const parents = areas.filter(
    (a) => a.id !== area?.id && AREA_LEVELS.indexOf(a.level as AreaLevel) < AREA_LEVELS.indexOf(level),
  )

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Give the area a name.')
    setBusy(true)
    setError('')
    const parentArea = areas.find((a) => a.id === parent)
    const r = await appStaff.saveArea(
      {
        name: name.trim(),
        level,
        parent: parent || null,
        region: region.trim() || parentArea?.name || '',
      },
      area?.id,
    )
    setBusy(false)
    if (!r.ok) return setError(r.message)
    update<StaffArea[]>(KEYS.areas, (list) => [...list.filter((a) => a.id !== r.value.id), r.value])
    invalidate(KEYS.areas, KEYS.hotlines)
    navigate('/manage?tab=areas', {
      replace: true,
      state: { notice: area ? 'Area saved.' : `${r.value.name} added.` },
    })
  }

  return (
    <form className={page.form} onSubmit={save} noValidate>
      <label className={page.field}>
        <span className={page.fieldLabel}>Name</span>
        <input
          className={page.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Salcedo"
          maxLength={80}
        />
      </label>
      <label className={page.field}>
        <span className={page.fieldLabel}>Kind</span>
        <select className={page.input} value={level} onChange={(e) => setLevel(e.target.value as AreaLevel)}>
          {AREA_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l[0].toUpperCase() + l.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label className={page.field}>
        <span className={page.fieldLabel}>Inside</span>
        <select className={page.input} value={parent} onChange={(e) => setParent(e.target.value)}>
          <option value="">Nothing (top level)</option>
          {parents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.level})
            </option>
          ))}
        </select>
      </label>
      <label className={page.field}>
        <span className={page.fieldLabel}>Province or region</span>
        <input
          className={page.input}
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="Eastern Samar"
          maxLength={80}
        />
      </label>
      {error && (
        <p className={page.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={page.primaryButton} disabled={busy}>
        <BusyContent busy={busy} busyLabel="Saving">
          Save area
        </BusyContent>
      </button>
      <p className={page.hint}>
        The area's ID never changes, so saved links keep working. Only an admin deletes an area.
      </p>
    </form>
  )
}
