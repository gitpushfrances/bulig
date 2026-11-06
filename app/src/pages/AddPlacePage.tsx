import { ArrowLeft, Camera, Check, CheckCircle, Image as ImageIcon, MapPin, X } from '@phosphor-icons/react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { TextField } from '../components/Fields.tsx'
import FormAlert from '../components/FormAlert.tsx'
import { CATEGORY_ICONS } from '../components/icons.ts'
import type { PinState } from '../components/PinPicker.tsx'
import { BusyContent } from '../components/Spinner.tsx'
import {
  EMPTY_DRAFT,
  FEATURES_FOR,
  LANDMARK_MAX,
  loadDraft,
  MAX_PHOTOS,
  NAME_MAX,
  NOTE_MAX,
  saveDraft,
  toChanges,
  today,
  isPhone,
  checkStep,
  type Draft,
  type HoursMode,
} from '../contribute/draft.ts'
import { shrinkPhoto } from '../contribute/photo.ts'
import { appContribute, type PhotoSource } from '../contribute/store.ts'
import { forgetMyUpdates } from '../contribute/useMyUpdates.ts'
import { appStaff } from '../staff/api.ts'
import { invalidate } from '../staff/snapshot.ts'
import { useAppData } from '../data/context.ts'
import { categoryLabel } from '../data/labels.ts'
import { usePhoneLocation } from '../location/context.ts'
import { distanceKm, nearestArea, type Position } from '../rules/nearby.ts'
import { CHIP_LABELS } from '../rules/needs.ts'
import { can } from '../rules/permissions.ts'
import { CATEGORIES, DAYS, type Day, type Service } from '../types.ts'
import page from './Page.module.css'
import styles from './AddPlace.module.css'

// The raised + (contributors and above): add a new place in four short steps, then check and send.
// Sends one POST /submissions with reason new_place (API.md §7.2). Nothing is public until a
// moderator approves it, and this page never says otherwise. See docs/UI-UX.md, "Add a place".

const PinPicker = lazy(() => import('../components/PinPicker.tsx'))

const STEPS = ['What is it?', 'Where is it?', 'Hours and services', 'Photos'] as const
const ADD_CATEGORIES = CATEGORIES.filter((c) => c !== 'lodging')
const DUPLICATE_M = 50
const ROUGH_M = 50
const DAY_NAMES: Record<Day, string> = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' }
// Fallback centre when there is no GPS and no pin yet: Guiuan, the pilot town.
const FALLBACK: Position = { lat: 11.0323, lng: 125.7214 }

type Picked = { url: string; file: File; source: PhotoSource }

const SEND_ERRORS: Record<string, string> = {
  offline: "It didn't go through. Check your signal and send again; your form is saved on this phone.",
  busy: "You've sent 10 updates today. Try again tomorrow; your form is saved.",
  closed: 'Updates are paused right now. Your form is saved; try again later.',
  forbidden: "This account can't add places. Ask a moderator to make you a contributor.",
  photo: 'A photo expired. Remove it and take it again, then send.',
  invalid: 'Something in the form needs a fix. Check each step and send again.',
}

const UPLOAD_ERRORS: Record<string, string> = {
  offline: "This photo didn't go through. Check your signal and try again.",
  busy: "You've added 30 photos today. Try again tomorrow.",
  invalid: "That file isn't a photo Bulig can use. Try another.",
  unavailable: "Photos can't be added right now. Try again later.",
}

export default function AddPlacePage() {
  const { account } = useAuth()
  const { data } = useAppData()
  const navigate = useNavigate()
  const { position, accuracy } = usePhoneLocation()
  const email = account?.email ?? ''
  const [draft, setDraft] = useState<Draft>(() => (email ? loadDraft(email) : EMPTY_DRAFT))
  const [step, setStep] = useState(0)
  const [stepError, setStepError] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sent, setSent] = useState(false)
  const [mapState, setMapState] = useState<PinState>('loading')
  const [picked, setPicked] = useState<Picked | null>(null)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [notDuplicate, setNotDuplicate] = useState<string | null>(null)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const top = useRef<HTMLHeadingElement>(null)

  const areas = data.status === 'ready' ? data.areas : []
  const services = useMemo(() => (data.status === 'ready' ? data.services : []), [data])
  const labels = data.status === 'ready' ? data.labels : null

  // Every change is kept on the phone at once.
  const update = (patch: Partial<Draft>) =>
    setDraft((d) => {
      const next = { ...d, ...patch }
      if (email) saveDraft(email, next)
      return next
    })

  useEffect(() => {
    top.current?.focus()
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [step, sent])

  useEffect(() => {
    if (!picked) return
    return () => URL.revokeObjectURL(picked.url)
  }, [picked])

  // Moderators and admins publish at once (API.md §7.8, POST /staff/services): nobody may approve
  // their own submission, so the queue would never clear it.
  const direct = can(account, 'review')
  if (!account) return null
  if (!can(account, 'contribute')) return <Navigate to="/" replace />

  const pin: Position | null = draft.lat !== null && draft.lng !== null ? { lat: draft.lat, lng: draft.lng } : null
  const setPin = (p: Position) => {
    const found = nearestArea(p, areas)
    update({ lat: p.lat, lng: p.lng, area: found?.area.id ?? draft.area })
  }
  const pinFromMe = pin && position ? Math.round(distanceKm(pin, position) * 1000) : null
  const duplicate: Service | null =
    pin && draft.category
      ? (services.find(
          (s) =>
            s.category === draft.category &&
            s.lat !== undefined &&
            s.lng !== undefined &&
            distanceKm(pin, { lat: s.lat, lng: s.lng }) * 1000 <= DUPLICATE_M,
        ) ?? null)
      : null

  const next = () => {
    const missing = checkStep(step, draft)
    if (missing) return setStepError(missing)
    setStepError('')
    setStep((s) => s + 1)
  }
  const back = () => {
    setStepError('')
    if (step === 0) navigate(-1)
    else setStep((s) => s - 1)
  }

  const openPicker = (source: PhotoSource) => {
    setPhotoError('')
    ;(source === 'camera' ? camera : gallery).current?.click()
  }
  const onFile = (source: PhotoSource) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPicked({ url: URL.createObjectURL(file), file, source })
  }
  const usePhoto = async () => {
    if (!picked) return
    setUploading(true)
    setPhotoError('')
    try {
      const { photo, thumb } = await shrinkPhoto(picked.file)
      const result = await appContribute.uploadPhoto(photo, picked.source)
      if (!result.ok) {
        setPhotoError(UPLOAD_ERRORS[result.reason])
        return
      }
      update({ photos: [...draft.photos, { id: result.id, uploadedAt: Date.now(), source: picked.source, thumb }] })
      setPicked(null)
    } catch {
      setPhotoError("That file isn't a photo Bulig can use. Try another.")
    } finally {
      setUploading(false)
    }
  }

  const send = async () => {
    const result = toChanges(draft)
    if (!result.ok) {
      setStep(result.step)
      setStepError(checkStep(result.step, draft) ?? 'Fill in this step first.')
      return
    }
    setSending(true)
    setSendError('')
    const note = [
      draft.note.trim(),
      draft.photos.some((p) => p.source === 'gallery') ? '(Some photos are from the gallery, not taken just now.)' : '',
    ]
      .filter(Boolean)
      .join(' ')
    const photoIds = draft.photos.map((p) => p.id)
    if (direct) {
      const added = await appStaff.addPlace({ ...result.changes, photoIds })
      setSending(false)
      if (!added.ok) return setSendError(added.message)
      invalidate('summary')
    } else {
      const outcome = await appContribute.submitNewPlace({
        changes: result.changes,
        photoIds,
        note: note || undefined,
        seenAt: today(),
      })
      setSending(false)
      if (!outcome.ok) return setSendError(SEND_ERRORS[outcome.reason])
    }
    saveDraft(email, null)
    forgetMyUpdates()
    setSent(true)
  }

  const startOver = () => {
    setDraft(EMPTY_DRAFT)
    setStep(0)
    setSent(false)
    setNotDuplicate(null)
  }

  if (sent) {
    return (
      <section className={styles.page} aria-labelledby="add-title">
        <div className={styles.sent}>
          <CheckCircle size={72} weight="fill" className={styles.sentIcon} aria-hidden="true" />
          <h1 id="add-title" ref={top} tabIndex={-1} className={page.title}>
            {direct ? 'Published' : 'Sent'}
          </h1>
          <p className={page.lead}>
            {direct
              ? "It's listed now. Phones see it within an hour."
              : "A moderator checks it before anyone sees it. You'll see the answer in My updates."}
          </p>
          <div className={styles.sentActions}>
            <button type="button" className={page.primaryButton} onClick={startOver}>
              Add another
            </button>
            {direct ? (
              <Link to="/map" className={page.secondary}>
                See the map
              </Link>
            ) : (
              <Link to="/updates" className={page.secondary}>
                See my updates
              </Link>
            )}
          </div>
        </div>
      </section>
    )
  }

  const CategoryIcon = draft.category ? CATEGORY_ICONS[draft.category] : MapPin
  const offers = draft.category ? (FEATURES_FOR[draft.category] ?? []) : []
  const review = step === STEPS.length

  return (
    <section className={styles.page} aria-labelledby="add-title">
      <header className={styles.head}>
        <button type="button" className={styles.headButton} onClick={back} aria-label={step === 0 ? 'Close' : 'Back'}>
          {step === 0 ? <X size={22} aria-hidden="true" /> : <ArrowLeft size={22} aria-hidden="true" />}
        </button>
        <p className={styles.headTitle}>Add a place</p>
        <p className={styles.headStep}>{review ? 'Check' : `${step + 1} of ${STEPS.length}`}</p>
      </header>
      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={STEPS.length}
        aria-valuenow={Math.min(step + 1, STEPS.length)}
      >
        <span style={{ width: `${(Math.min(step + 1, STEPS.length) / STEPS.length) * 100}%` }} />
      </div>

      <h1 id="add-title" ref={top} tabIndex={-1} className={styles.stepTitle}>
        {review ? 'Check and send' : STEPS[step]}
      </h1>

      {step === 0 && (
        <>
          <fieldset className={styles.fieldset}>
            <legend className={page.fieldLabel}>What kind of place?</legend>
            <div className={styles.tiles}>
              {ADD_CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c]
                const on = draft.category === c
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    className={`${styles.tile} ${c === 'other' ? styles.wide : ''}`}
                    onClick={() => update({ category: c, features: [] })}
                  >
                    <Icon size={26} aria-hidden="true" />
                    <span>{categoryLabel(c, labels)}</span>
                    {on && <Check size={18} weight="bold" className={styles.tick} aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <TextField
            label="Name"
            value={draft.name}
            maxLength={NAME_MAX}
            autoComplete="off"
            placeholder="Aling Nena Vulcanizing"
            onChange={(v) => update({ name: v })}
          />
          {draft.category === 'other' && (
            <TextField
              label="What is it? (one or two words)"
              value={draft.subtype}
              maxLength={30}
              placeholder="Halo-halo"
              onChange={(v) => update({ subtype: v })}
            />
          )}
        </>
      )}

      {step === 1 && (
        <>
          {mapState !== 'failed' ? (
            <Suspense fallback={<div className={styles.mapWait}>Loading the map…</div>}>
              <PinPicker
                start={pin ?? position ?? FALLBACK}
                places={services.filter((s) => s.category === draft.category)}
                onMove={setPin}
                onState={setMapState}
              />
            </Suspense>
          ) : (
            <div className={styles.noMap}>
              <p>The map can't load right now. Stand at the place and use your phone's location instead.</p>
              <button
                type="button"
                className={page.primaryButton}
                disabled={!position}
                onClick={() => position && setPin(position)}
              >
                <MapPin size={20} aria-hidden="true" />
                Use where I'm standing
              </button>
              {!position && <p className={page.hint}>Turn on location to use this.</p>}
            </div>
          )}
          {pin && (
            <p className={styles.pinLine}>
              {pinFromMe !== null ? `Pin is ${formatM(pinFromMe)} from you` : 'Pin placed'}
              {draft.area && ` · ${areas.find((a) => a.id === draft.area)?.name ?? ''}`}
            </p>
          )}
          {mapState === 'failed' && pin && accuracy !== null && accuracy > ROUGH_M && (
            <p className={styles.warn}>Your location is rough (about {Math.round(accuracy)} m). Walk to the place and try again.</p>
          )}
          {duplicate && notDuplicate !== duplicate.id && (
            <div className={styles.duplicate} role="status">
              <p>
                Is this <strong>{duplicate.name}</strong>? It's already listed, about {DUPLICATE_M} m away or less.
              </p>
              <div className={styles.duplicateActions}>
                <Link to={`/place/${duplicate.id}`} className={page.secondary}>
                  Open that one
                </Link>
                <button type="button" className={page.secondary} onClick={() => setNotDuplicate(duplicate.id)}>
                  No, it's new
                </button>
              </div>
            </div>
          )}
          <label className={page.field}>
            <span className={page.fieldLabel}>Town</span>
            <select
              className={page.input}
              value={draft.area ?? ''}
              onChange={(e) => update({ area: e.target.value || null })}
            >
              <option value="">Pick the town</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}, {a.region}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="Landmark"
            value={draft.landmark}
            maxLength={LANDMARK_MAX}
            placeholder="Beside the Petron, blue gate"
            hint="What a stranger would look for. No house numbers."
            onChange={(v) => update({ landmark: v })}
          />
        </>
      )}

      {step === 2 && (
        <>
          <fieldset className={styles.fieldset}>
            <legend className={page.fieldLabel}>Usual hours</legend>
            <div className={styles.segmented3} role="radiogroup" aria-label="Usual hours">
              {(
                [
                  ['same', 'Every day'],
                  ['allday', '24 hours'],
                  ['byday', 'By day'],
                ] as [HoursMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={draft.hoursMode === mode}
                  onClick={() => update({ hoursMode: mode })}
                >
                  {label}
                </button>
              ))}
            </div>
            {draft.hoursMode === 'same' && (
              <div className={styles.times}>
                <TimeField label="Opens" value={draft.opens} onChange={(v) => update({ opens: v })} />
                <TimeField label="Closes" value={draft.closes} onChange={(v) => update({ closes: v })} />
              </div>
            )}
            {draft.hoursMode === 'byday' && (
              <ul className={styles.days}>
                {DAYS.map((d) => {
                  const r = draft.days[d]
                  const setDay = (v: [string, string] | undefined) => update({ days: { ...draft.days, [d]: v } })
                  return (
                    <li key={d} className={styles.day}>
                      <label className={styles.dayToggle}>
                        <input
                          type="checkbox"
                          checked={!!r}
                          onChange={(e) => setDay(e.target.checked ? ['08:00', '17:00'] : undefined)}
                        />
                        {DAY_NAMES[d]}
                      </label>
                      {r ? (
                        <span className={styles.dayTimes}>
                          <input
                            type="time"
                            className={page.input}
                            aria-label={`${DAY_NAMES[d]} opens`}
                            value={r[0]}
                            onChange={(e) => setDay([e.target.value, r[1]])}
                          />
                          <input
                            type="time"
                            className={page.input}
                            aria-label={`${DAY_NAMES[d]} closes`}
                            value={r[1]}
                            onChange={(e) => setDay([r[0], e.target.value])}
                          />
                        </span>
                      ) : (
                        <span className={styles.closed}>Closed</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <p className={page.hint}>Not sure? Leave it empty. Bulig only ever says "usually open".</p>
          </fieldset>
          {offers.length > 0 && (
            <fieldset className={styles.fieldset}>
              <legend className={page.fieldLabel}>What do they offer?</legend>
              <div className={styles.offers}>
                {offers.map((f) => {
                  const on = draft.features.includes(f)
                  return (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={on}
                      className={styles.offer}
                      onClick={() =>
                        update({ features: on ? draft.features.filter((x) => x !== f) : [...draft.features, f] })
                      }
                    >
                      {on && <Check size={18} weight="bold" aria-hidden="true" />}
                      {CHIP_LABELS[f]}
                    </button>
                  )
                })}
              </div>
              <p className={page.hint}>Tick only what you saw or asked about.</p>
            </fieldset>
          )}
          <TextField
            label="Phone (optional)"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={draft.phone}
            placeholder="0917 555 0199"
            error={!isPhone(draft.phone) ? 'Enter a mobile number like 0917 123 4567.' : undefined}
            onChange={(v) => update({ phone: v })}
          />
        </>
      )}

      {step === 3 && (
        <>
          <input
            ref={camera}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={onFile('camera')}
            data-testid="camera-input"
          />
          <input ref={gallery} type="file" accept="image/*" hidden onChange={onFile('gallery')} data-testid="gallery-input" />
          {draft.photos.length < MAX_PHOTOS && (
            <div className={styles.shoot}>
              <Camera size={36} aria-hidden="true" className={styles.shootIcon} />
              <p>Take a photo of the place from the road, with its sign if it has one.</p>
              <button type="button" className={page.primaryButton} onClick={() => openPicker('camera')}>
                <Camera size={20} aria-hidden="true" />
                Take photo
              </button>
              <button type="button" className={page.textButton} onClick={() => openPicker('gallery')}>
                Choose from gallery
              </button>
            </div>
          )}
          {photoError && <FormAlert onClose={() => setPhotoError('')}>{photoError}</FormAlert>}
          <ul className={styles.photos} aria-label="Photos">
            {Array.from({ length: MAX_PHOTOS }, (_, i) => {
              const p = draft.photos[i]
              return (
                <li key={p?.id ?? `empty-${i}`} className={styles.slot}>
                  {p ? (
                    <>
                      <img src={p.thumb} alt={`Photo ${i + 1}`} />
                      {i === 0 && <span className={styles.cover}>Cover</span>}
                      {p.source === 'gallery' && <span className={styles.fromGallery}>Gallery</span>}
                      <button
                        type="button"
                        className={styles.remove}
                        aria-label={`Remove photo ${i + 1}`}
                        onClick={() => update({ photos: draft.photos.filter((x) => x.id !== p.id) })}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <span className={styles.empty} aria-hidden="true">
                      <ImageIcon size={22} />
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          {!direct && (
            <label className={page.field}>
              <span className={page.fieldLabel}>Note for the moderator (optional)</span>
              <textarea
                className={`${page.input} ${styles.note}`}
                value={draft.note}
                maxLength={NOTE_MAX}
                rows={3}
                placeholder="Owner is Aling Nena. Opens early on market day."
                onChange={(e) => update({ note: e.target.value })}
              />
              <span className={page.hint}>Only the moderator sees this.</span>
            </label>
          )}
        </>
      )}

      {review && (
        <>
          <dl className={styles.summary}>
            <SummaryRow label="Place" onEdit={() => setStep(0)}>
              <span className={styles.summaryName}>
                <CategoryIcon size={20} aria-hidden="true" />
                {draft.name}
              </span>
              {draft.category && (
                <span className={styles.muted}>
                  {draft.category === 'other' && draft.subtype ? draft.subtype : categoryLabel(draft.category, labels)}
                </span>
              )}
            </SummaryRow>
            <SummaryRow label="Where" onEdit={() => setStep(1)}>
              {draft.landmark}
              <span className={styles.muted}>{areas.find((a) => a.id === draft.area)?.name}</span>
            </SummaryRow>
            <SummaryRow label="Hours" onEdit={() => setStep(2)}>
              {hoursText(draft)}
            </SummaryRow>
            {offers.length > 0 && (
              <SummaryRow label="Offers" onEdit={() => setStep(2)}>
                {draft.features.length ? draft.features.map((f) => CHIP_LABELS[f]).join(', ') : 'Nothing ticked'}
              </SummaryRow>
            )}
            {draft.phone.trim() && (
              <SummaryRow label="Phone" onEdit={() => setStep(2)}>
                {draft.phone}
              </SummaryRow>
            )}
            <SummaryRow label="Photos" onEdit={() => setStep(3)}>
              <span className={styles.summaryPhotos}>
                {draft.photos.map((p, i) => (
                  <img key={p.id} src={p.thumb} alt={`Photo ${i + 1}`} />
                ))}
              </span>
            </SummaryRow>
          </dl>
          <p className={page.hint}>
            {direct
              ? 'As a moderator, your place goes live at once. Check it twice.'
              : 'A moderator checks it before anyone sees it.'}
          </p>
          {sendError && <FormAlert onClose={() => setSendError('')}>{sendError}</FormAlert>}
        </>
      )}

      {stepError && <FormAlert onClose={() => setStepError('')}>{stepError}</FormAlert>}

      <div className={styles.footer}>
        {review ? (
          <button
            type="button"
            className={`${page.primaryButton} ${styles.full}`}
            onClick={send}
            disabled={sending}
            aria-busy={sending || undefined}
          >
            <BusyContent busy={sending} busyLabel={direct ? 'Publishing…' : 'Sending…'}>
              {direct ? 'Publish' : 'Send'}
            </BusyContent>
          </button>
        ) : (
          <button type="button" className={`${page.primaryButton} ${styles.full}`} onClick={next}>
            {step === STEPS.length - 1 ? 'Check and send' : 'Next'}
          </button>
        )}
        <p className={styles.saved}>Saved on this phone as you type.</p>
      </div>

      {picked && (
        <div className={styles.preview} role="dialog" aria-modal="true" aria-label="Use this photo?">
          <img src={picked.url} alt="The photo you just picked" />
          {photoError && <p className={styles.previewError}>{photoError}</p>}
          <div className={styles.previewActions}>
            <button
              type="button"
              className={styles.retake}
              disabled={uploading}
              onClick={() => {
                const source = picked.source
                setPicked(null)
                openPicker(source)
              }}
            >
              {picked.source === 'camera' ? 'Retake' : 'Choose another'}
            </button>
            <button
              type="button"
              className={page.primaryButton}
              onClick={usePhoto}
              disabled={uploading}
              aria-busy={uploading || undefined}
            >
              <BusyContent busy={uploading} busyLabel="Adding the photo…">
                Use photo
              </BusyContent>
            </button>
          </div>
          <button
            type="button"
            className={styles.previewClose}
            aria-label="Cancel"
            disabled={uploading}
            onClick={() => setPicked(null)}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  )
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className={page.field}>
      <span className={page.fieldLabel}>{label}</span>
      <input type="time" className={page.input} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function SummaryRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className={styles.summaryRow}>
      <dt>{label}</dt>
      <dd>{children}</dd>
      <button type="button" className={page.textButton} onClick={onEdit} aria-label={`Edit ${label.toLowerCase()}`}>
        Edit
      </button>
    </div>
  )
}

function formatM(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`
}

function clock(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const suffix = h < 12 || h === 24 ? 'AM' : 'PM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

function hoursText(draft: Draft): string {
  if (draft.hoursMode === 'allday') return 'Open 24 hours'
  if (draft.hoursMode === 'same')
    return draft.opens && draft.closes ? `${clock(draft.opens)} to ${clock(draft.closes)}, every day` : 'Not given'
  const days = DAYS.filter((d) => draft.days[d])
  return days.length ? days.map((d) => `${DAY_NAMES[d]} ${clock(draft.days[d]![0])}–${clock(draft.days[d]![1])}`).join(', ') : 'Not given'
}

