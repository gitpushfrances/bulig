import {
  Binoculars,
  Camera,
  CheckCircle,
  Clock,
  Eye,
  ListChecks,
  PaperPlaneTilt,
  PencilSimpleLine,
  PlusCircle,
  SealCheck,
  Storefront,
  UsersThree,
  XCircle,
  type Icon,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { homeAreaText } from '../auth/homeArea.ts'
import { SCOUT } from '../auth/types.ts'
import { TextField } from '../components/Fields.tsx'
import FormAlert from '../components/FormAlert.tsx'
import RopiSays from '../components/RopiSays.tsx'
import { RowsSkeleton } from '../components/Skeleton.tsx'
import { BusyContent } from '../components/Spinner.tsx'
import {
  AREA_MAX,
  WHY_MAX,
  canApplyAgain,
  createAppScout,
  rememberScoutRequest,
  TRAVEL,
  TRAVEL_LABELS,
  type ApplyResult,
  type Travel,
  type ScoutRequest,
  type ScoutStore,
} from '../contribute/scout.ts'
import { useAppData } from '../data/context.ts'
import { can } from '../rules/permissions.ts'
import { SubPage } from './AccountPages.tsx'
import page from './Page.module.css'
import styles from './Scout.module.css'

// Profile → Become a Bulig Scout (John, 2026-11-10). A regular user learns what a Scout is (the
// `contributor` role), asks to become one, then sees where the request stands. A moderator decides.

const DOES: { icon: Icon; title: string; text: string; soon?: boolean }[] = [
  {
    icon: Storefront,
    title: 'Add new places',
    text: 'A new vulcanizing shop, a carinderia by the highway, a gas station that just opened.',
  },
  {
    icon: PencilSimpleLine,
    title: 'Fix what changed',
    text: 'New prices, hours, services or phone numbers on places already in Bulig.',
    soon: true,
  },
  {
    icon: Camera,
    title: 'Show it with a photo',
    text: 'Taken on the spot, so a moderator can see it is real.',
  },
]

const STEPS: { icon: Icon; title: string; text: string }[] = [
  { icon: Eye, title: 'You see it', text: 'On your usual road, in your own town.' },
  { icon: PaperPlaneTilt, title: 'You send it', text: 'In Bulig, with a photo. Takes about a minute.' },
  {
    icon: SealCheck,
    title: 'A moderator checks it',
    text: 'Detail by detail. Only what they approve goes in; nothing is public before that.',
  },
  { icon: UsersThree, title: 'Every traveller sees it', text: 'With the date it was checked.' },
]

const RULES = [
  'Only send what you saw yourself, recently.',
  'Take photos on the spot. Keep faces and plate numbers out.',
  'Pull over before you use your phone.',
  'Not for your own business. Owners get their own tools later.',
  'Made-up or copied details lose the Scout badge.',
]

const APPLY_ERRORS: Record<Exclude<ApplyResult, { ok: true }>['reason'], string> = {
  offline: "It didn't go through. Check your signal and try again. The server may be waking up.",
  invalid: 'Check the barangay and town, then try again.',
  pending: 'You already have a request waiting.',
  already: 'Your account can already add places.',
  too_soon: 'You can ask again a little later.',
  busy: 'Too many tries. Wait a few minutes and try again.',
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })

function Explainer({ onApply, declined }: { onApply: () => void; declined: ScoutRequest | null }) {
  return (
    <>
      {declined && <Status request={declined} />}
      <RopiSays variant="friendly" height={112}>
        <strong>Know your town&apos;s roads?</strong> Scouts keep Bulig right for everyone who passes through.
      </RopiSays>

      <section className={page.section} aria-labelledby="scout-does">
        <h2 id="scout-does" className={page.sectionTitle}>
          What Scouts do
        </h2>
        <ul className={styles.does}>
          {DOES.map(({ icon: Icon, title, text, soon }) => (
            <li key={title} className={styles.do}>
              <span className={styles.doIcon}>
                <Icon size={24} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <p className={styles.doTitle}>
                  {title}
                  {soon && <span className={styles.soon}>Soon</span>}
                </p>
                <p className={styles.doText}>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={page.section} aria-labelledby="scout-how">
        <h2 id="scout-how" className={page.sectionTitle}>
          How it works
        </h2>
        <ol className={styles.steps}>
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className={styles.step}>
              <span className={styles.stepDot} aria-hidden="true">
                <Icon size={20} weight="bold" />
              </span>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>
                  <span className={styles.stepNo}>{i + 1}</span>
                  {title}
                </p>
                <p className={styles.doText}>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={page.section} aria-labelledby="scout-rules">
        <h2 id="scout-rules" className={page.sectionTitle}>
          Scout rules
        </h2>
        <ul className={styles.rules}>
          {RULES.map((r) => (
            <li key={r}>
              <CheckCircle size={20} weight="fill" aria-hidden="true" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.not}>
        <p className={styles.notTitle}>What a Scout is not</p>
        <p>
          Not a rescuer: Scouts don&apos;t go out to help people, take calls or get anyone&apos;s location. Not a job:
          it&apos;s free and unpaid. In an emergency, everyone calls 911.
        </p>
      </div>

      <div className={styles.cta}>
        <button type="button" className={page.primaryButton} onClick={onApply}>
          <Binoculars size={20} aria-hidden="true" />
          {declined ? 'Apply again' : 'Apply to be a Scout'}
        </button>
        <p className={page.hint}>Free. A moderator reads every request.</p>
      </div>
    </>
  )
}

function ApplyForm({
  store,
  initialArea,
  onBack,
  onSent,
}: {
  store: ScoutStore
  initialArea: string
  onBack: () => void
  onSent: (r: ScoutRequest) => void
}) {
  const [area, setArea] = useState(initialArea)
  const [travel, setTravel] = useState<Travel[]>([])
  const [why, setWhy] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [adult, setAdult] = useState(false)
  const [errors, setErrors] = useState<{ area?: string; travel?: string; agreed?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next = {
      area: area.trim().length < 3 ? 'Enter the barangay and town you know well.' : undefined,
      travel: travel.length ? undefined : 'Pick at least one.',
      agreed: agreed && adult ? undefined : 'Tick both to send your request.',
    }
    setErrors(next)
    setFormError(null)
    if (next.area || next.travel || next.agreed) return
    setBusy(true)
    const result = await store.apply({ area, travel, why })
    setBusy(false)
    if (result.ok) return onSent(result.request)
    setFormError(
      result.reason === 'too_soon' && result.canApplyAgainAt
        ? `You can ask again on ${day(result.canApplyAgainAt)}.`
        : APPLY_ERRORS[result.reason],
    )
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate aria-labelledby="scout-apply">
      <h2 id="scout-apply" className={page.sectionTitle}>
        Apply to be a Scout
      </h2>
      <TextField
        label="Barangay and town you know well"
        value={area}
        maxLength={AREA_MAX}
        autoComplete="off"
        placeholder="e.g. Surok, Guiuan"
        hint="Your barangay and town are enough. No house address."
        error={errors.area}
        onChange={(v) => {
          setArea(v)
          setErrors((x) => ({ ...x, area: undefined }))
        }}
      />
      <fieldset className={styles.travel} aria-describedby={errors.travel ? 'scout-travel-error' : undefined}>
        <legend className={page.fieldLabel}>How do you get around?</legend>
        <div className={styles.travelChips}>
          {TRAVEL.map((t) => (
            <button
              key={t}
              type="button"
              className={page.filterChip}
              aria-pressed={travel.includes(t)}
              onClick={() => {
                setTravel((now) => (now.includes(t) ? now.filter((x) => x !== t) : [...now, t]))
                setErrors((x) => ({ ...x, travel: undefined }))
              }}
            >
              {TRAVEL_LABELS[t]}
            </button>
          ))}
        </div>
        {errors.travel && (
          <span id="scout-travel-error" className={page.error}>
            {errors.travel}
          </span>
        )}
      </fieldset>
      <label className={page.field}>
        <span className={page.fieldLabel}>Anything else for the moderator? (optional)</span>
        <textarea
          className={`${page.input} ${styles.why}`}
          value={why}
          maxLength={WHY_MAX}
          rows={3}
          placeholder="Tricycle driver, Guiuan to Mercedes every day."
          onChange={(e) => setWhy(e.target.value)}
        />
        <span className={page.hint}>Helps the moderator decide. Only staff see it.</span>
      </label>
      <div className={page.field}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={agreed}
            aria-invalid={errors.agreed && !agreed ? true : undefined}
            aria-describedby={errors.agreed ? 'scout-agree-error' : undefined}
            onChange={(e) => {
              setAgreed(e.target.checked)
              setErrors((x) => ({ ...x, agreed: undefined }))
            }}
          />
          <span>I&apos;ll follow the Scout rules.</span>
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={adult}
            aria-invalid={errors.agreed && !adult ? true : undefined}
            onChange={(e) => {
              setAdult(e.target.checked)
              setErrors((x) => ({ ...x, agreed: undefined }))
            }}
          />
          <span>I&apos;m 18 or older.</span>
        </label>
        {errors.agreed && (
          <span id="scout-agree-error" className={page.error}>
            {errors.agreed}
          </span>
        )}
      </div>
      {formError && <FormAlert onClose={() => setFormError(null)}>{formError}</FormAlert>}
      <button type="submit" className={page.primaryButton} disabled={busy} aria-busy={busy}>
        <BusyContent busy={busy} busyLabel="Sending your request…">
          <PaperPlaneTilt size={20} aria-hidden="true" />
          Send request
        </BusyContent>
      </button>
      <button type="button" className={page.secondary} disabled={busy} onClick={onBack}>
        Back to what Scouts do
      </button>
    </form>
  )
}

// Right after Send request: a clear "it worked", what was sent, and what happens next.
function Sent({ request }: { request: ScoutRequest }) {
  return (
    <>
      <div className={styles.sent} role="status">
        <span className={styles.sentMark} aria-hidden="true">
          <CheckCircle size={56} weight="fill" />
        </span>
        <h2 className={styles.sentTitle}>Request sent</h2>
        <p>A moderator will read it. The answer shows on this page.</p>
      </div>
      <dl className={styles.sentList}>
        <div>
          <dt>Area you know</dt>
          <dd>{request.area}</dd>
        </div>
        {request.travel?.length > 0 && (
          <div>
            <dt>Gets around by</dt>
            <dd>{request.travel.map((t) => TRAVEL_LABELS[t] ?? t).join(', ')}</dd>
          </div>
        )}
        {request.why && (
          <div>
            <dt>Your note</dt>
            <dd>{request.why}</dd>
          </div>
        )}
      </dl>
      <section className={page.section} aria-labelledby="scout-next">
        <h2 id="scout-next" className={page.sectionTitle}>
          What happens next
        </h2>
        <ol className={styles.next}>
          <li>A moderator reads your request, usually within a few days.</li>
          <li>If it&apos;s a yes, your badge changes to Scout and the Add button shows up.</li>
          <li>If it&apos;s a no, you&apos;ll see why, and you can ask again in 30 days.</li>
        </ol>
      </section>
      <Link to="/profile" className={page.primaryButton}>
        Back to Profile
      </Link>
    </>
  )
}

function Status({ request }: { request: ScoutRequest }) {
  if (request.status === 'pending')
    return (
      <div className={`${styles.status} ${styles.pending}`} role="status">
        <Clock size={28} weight="fill" aria-hidden="true" />
        <div>
          <p className={styles.statusTitle}>Request sent</p>
          <p>
            Sent {day(request.createdAt)} for {request.area}. A moderator will look at it. The answer shows here, so
            check back in a few days.
          </p>
        </div>
      </div>
    )
  if (request.status === 'declined')
    return (
      <div className={`${styles.status} ${styles.declined}`} role="status">
        <XCircle size={28} weight="fill" aria-hidden="true" />
        <div>
          <p className={styles.statusTitle}>Not this time</p>
          {request.reviewNote && <p>Moderator: “{request.reviewNote}”</p>}
          {!canApplyAgain(request) && request.canApplyAgainAt && (
            <p>You can ask again on {day(request.canApplyAgainAt)}.</p>
          )}
        </div>
      </div>
    )
  return null
}

export default function ScoutPage() {
  const { account, refreshAccount } = useAuth()
  const { data } = useAppData()
  const email = account?.email ?? null
  // Rebuilt only when the person changes, so the local store reads the right account.
  const store = useMemo(() => createAppScout(() => email), [email])
  const [request, setRequest] = useState<ScoutRequest | null | 'error' | undefined>(undefined)
  const [mode, setMode] = useState<'learn' | 'form' | 'sent'>('learn')
  const [attempt, setAttempt] = useState(0)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawFailed, setWithdrawFailed] = useState(false)
  const isScout = can(account, 'contribute')

  useEffect(() => {
    if (!email || isScout) return
    let live = true
    void store.myRequest().then((r) => {
      if (!live) return
      setRequest(r)
      if (r !== 'error') rememberScoutRequest(email, r)
      // A moderator said yes: pick up the new role from the server.
      if (r !== 'error' && r?.status === 'approved') void refreshAccount()
    })
    return () => {
      live = false
    }
    // refreshAccount is a fresh function each render; the request is read once per person and retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, email, isScout, attempt])

  if (!account) return null

  if (isScout)
    return (
      <SubPage title={SCOUT}>
        <div className={`${styles.status} ${styles.approved}`}>
          <SealCheck size={28} weight="fill" aria-hidden="true" />
          <div>
            <p className={styles.statusTitle}>
              {account.role === 'contributor' ? `You're a ${SCOUT}` : 'Staff can already add places'}
            </p>
            <p>Add places you see on the road. A moderator checks each one before travellers see it.</p>
          </div>
        </div>
        <Link to="/add" className={page.primaryButton}>
          <PlusCircle size={20} aria-hidden="true" />
          Add a place
        </Link>
        <Link to="/updates" className={page.secondary}>
          <ListChecks size={20} aria-hidden="true" />
          My updates
        </Link>
      </SubPage>
    )

  const lead = 'Trusted locals who keep the places on Bulig right.'
  const send = (r: ScoutRequest) => {
    rememberScoutRequest(account.email, r)
    setRequest(r)
    setMode('sent')
    window.scrollTo({ top: 0 })
  }

  let body
  if (request === undefined) body = <RowsSkeleton count={3} />
  else if (request === 'error')
    body = (
      <div className={page.empty}>
        <p>Couldn&apos;t load your request. The server may be waking up; this can take a minute.</p>
        <button type="button" className={page.secondary} onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    )
  else if (request?.status === 'approved')
    body = (
      <div className={`${styles.status} ${styles.approved}`} role="status">
        <SealCheck size={28} weight="fill" aria-hidden="true" />
        <div>
          <p className={styles.statusTitle}>You&apos;re in!</p>
          <p>Getting your Scout tools ready. If this stays, close Bulig and open it again.</p>
        </div>
      </div>
    )
  else if (request?.status === 'pending' && mode === 'sent') body = <Sent request={request} />
  else if (request?.status === 'pending')
    body = (
      <>
        <Status request={request} />
        <button
          type="button"
          className={page.secondary}
          disabled={withdrawing}
          aria-busy={withdrawing}
          onClick={async () => {
            setWithdrawing(true)
            setWithdrawFailed(false)
            const ok = await store.withdraw()
            setWithdrawing(false)
            if (!ok) return setWithdrawFailed(true)
            rememberScoutRequest(account.email, null)
            setRequest(null)
          }}
        >
          <BusyContent busy={withdrawing} busyLabel="Taking back your request…">
            Take back my request
          </BusyContent>
        </button>
        {withdrawFailed && (
          <p className={page.error} role="alert">
            Couldn&apos;t take it back. Check your connection and try again.
          </p>
        )}
      </>
    )
  else if (request?.status === 'declined' && !canApplyAgain(request)) body = <Status request={request} />
  else if (mode === 'form')
    body = (
      <ApplyForm
        store={store}
        initialArea={homeAreaText(account.homeArea, data.status === 'ready' ? data.areas : []) ?? ''}
        onBack={() => setMode('learn')}
        onSent={send}
      />
    )
  else
    body = (
      <Explainer
        declined={request?.status === 'declined' ? request : null}
        onApply={() => {
          setMode('form')
          window.scrollTo({ top: 0 })
        }}
      />
    )

  return (
    <SubPage title={`Become a ${SCOUT}`} lead={lead}>
      {body}
    </SubPage>
  )
}
