import {
  Camera,
  CheckCircle,
  Eye,
  HandHeart,
  Hourglass,
  type Icon,
  ListChecks,
  MinusCircle,
  PaperPlaneTilt,
  PlusCircle,
  ShieldCheck,
  UsersThree,
} from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/context.ts'
import { ROLE_LABELS } from '../auth/types.ts'
import RopiSays from '../components/RopiSays.tsx'
import { BusyContent } from '../components/Spinner.tsx'
import { TextField } from '../components/Fields.tsx'
import { formatDate } from '../data/format.ts'
import { SubPage } from './AccountPages.tsx'
import page from './Page.module.css'
import auth from './Auth.module.css'
import styles from './Contributor.module.css'

export const AREA_MIN = 3
export const AREA_MAX = 120
export const REASON_MAX = 300

// From seeing it on the road to everyone seeing it in Bulig. Nothing skips the moderator.
const FLOW: { icon: Icon; title: string; text: string }[] = [
  { icon: Eye, title: 'You see it', text: 'A new vulcanizing shop, a new price, a station that closed.' },
  { icon: PaperPlaneTilt, title: 'You send it', text: 'Add the place or update its details, with a photo if you can.' },
  { icon: ShieldCheck, title: 'A moderator checks it', text: 'Often by calling the place. Nothing goes live before this.' },
  { icon: UsersThree, title: 'Everyone sees it', text: 'It shows in Bulig with the date it was checked. You see the answer in My updates.' },
]

// What changes: a user can flag; a contributor can also send the fix.
const CAN: { what: string; user: boolean }[] = [
  { what: 'Save places and numbers', user: true },
  { what: 'Flag a wrong number or a closed place', user: true },
  { what: 'Add a new place', user: false },
  { what: 'Update prices, hours and services', user: false },
  { what: 'Ask to remove a place that closed', user: false },
]

const ASK: { icon: Icon; text: string }[] = [
  { icon: Eye, text: 'Only send what you saw yourself, recently.' },
  { icon: Camera, text: 'Add a photo when it is safe to take one. Never while driving.' },
  { icon: ShieldCheck, text: "No house addresses, plate numbers or anyone's private number." },
  { icon: HandHeart, text: 'It is volunteer work: Bulig never pays for updates, and nobody pays to be listed.' },
]

const ERRORS = {
  invalid: 'Check the area and try again.',
  already: 'Your request is already in. A moderator will look at it.',
  wait: 'You asked recently. You can ask again 30 days after the last answer.',
  offline: "Couldn't reach Bulig. Check your connection and try again.",
  unavailable: "Bulig can't take requests right now. Try again later.",
} as const

// Profile > Become a contributor: what the role is, how an update travels, what we ask, then a short
// request a moderator answers in Manage > Users (API.md §5.9 and §7.8). For users only; contributors
// and staff see where to start instead.
export default function ContributorPage() {
  const { account } = useAuth()
  if (!account) return null
  const request = account.contributorRequest

  return (
    <SubPage title="Become a contributor" lead="Help keep Bulig right for everyone on the road.">
      <RopiSays variant="ready" height={96} side>
        <strong>Contributors are Bulig&apos;s eyes on the road.</strong> You know your area best.
      </RopiSays>

      <section className={page.section} aria-labelledby="how-title">
        <h2 id="how-title" className={page.sectionTitle}>
          How an update travels
        </h2>
        <ol className={styles.flow}>
          {FLOW.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className={styles.step}>
              <span className={styles.dot} aria-hidden="true">
                <Icon size={20} weight="bold" />
              </span>
              <p>
                <strong>
                  <span className="visually-hidden">Step {i + 1}: </span>
                  {title}
                </strong>
                <span>{text}</span>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className={page.section} aria-labelledby="can-title">
        <h2 id="can-title" className={page.sectionTitle}>
          What you can do
        </h2>
        <table className={styles.compare}>
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">What</span>
              </th>
              <th scope="col">{ROLE_LABELS.user}</th>
              <th scope="col" className={styles.you}>
                {ROLE_LABELS.contributor}
              </th>
            </tr>
          </thead>
          <tbody>
            {CAN.map(({ what, user }) => (
              <tr key={what}>
                <th scope="row">{what}</th>
                <td>{user ? <Yes /> : <No />}</td>
                <td className={styles.you}>
                  <Yes />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={page.hint}>Everything a contributor sends waits for a moderator. You can&apos;t change 911 or emergency numbers.</p>
      </section>

      <section className={page.section} aria-labelledby="ask-title">
        <h2 id="ask-title" className={page.sectionTitle}>
          What we ask of you
        </h2>
        <ul className={styles.ask}>
          {ASK.map(({ icon: Icon, text }) => (
            <li key={text}>
              <Icon size={20} aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={page.section} aria-labelledby="ask-now-title">
        <h2 id="ask-now-title" className={page.sectionTitle}>
          {account.role === 'user' ? 'Ask to be a contributor' : 'You can contribute'}
        </h2>
        {account.role !== 'user' ? (
          <Ready role={account.role} />
        ) : request?.status === 'pending' ? (
          <div className={styles.status} role="status">
            <Hourglass size={24} aria-hidden="true" />
            <p>
              <strong>We got your request on {formatDate(request.createdAt)}.</strong>
              <span>A moderator will look at it. There&apos;s nothing else to do; check back here.</span>
            </p>
          </div>
        ) : request?.status === 'declined' && request.canAskAgainOn && request.canAskAgainOn > today() ? (
          <div className={styles.status} role="status">
            <MinusCircle size={24} aria-hidden="true" />
            <p>
              <strong>Not this time.</strong>
              <span>
                A moderator couldn&apos;t say yes yet. Keep flagging wrong info: it helps. You can ask again from{' '}
                {formatDate(request.canAskAgainOn)}.
              </span>
            </p>
          </div>
        ) : (
          <RequestForm />
        )}
      </section>
    </SubPage>
  )
}

const today = () => new Date().toISOString().slice(0, 10)

function Yes() {
  return (
    <span className={styles.yes}>
      <CheckCircle size={22} weight="fill" aria-hidden="true" />
      <span className="visually-hidden">Yes</span>
    </span>
  )
}

function No() {
  return (
    <span className={styles.no}>
      <MinusCircle size={22} aria-hidden="true" />
      <span className="visually-hidden">No</span>
    </span>
  )
}

function Ready({ role }: { role: string }) {
  return (
    <div className={styles.ready}>
      <p className={page.lead}>
        {role === 'contributor' ? "You're a contributor. Thank you!" : 'Moderators and admins can already add and update places.'}
      </p>
      <Link className={page.primaryButton} to="/add">
        <PlusCircle size={18} aria-hidden="true" />
        Add a place
      </Link>
      <Link className={page.secondary} to="/updates">
        <ListChecks size={18} aria-hidden="true" />
        My updates
      </Link>
    </div>
  )
}

function RequestForm() {
  const { account, requestContributor } = useAuth()
  const [area, setArea] = useState(account?.homeArea ?? '')
  const [reason, setReason] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState<{ area?: string; agreed?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const length = area.trim().length
    const found = {
      area:
        length < AREA_MIN
          ? 'Tell us the towns or roads you know, like "Guiuan to Borongan".'
          : length > AREA_MAX
            ? `Keep it under ${AREA_MAX} characters.`
            : '',
      agreed: agreed ? '' : 'Tick the box to agree.',
    }
    setErrors(found)
    if (found.area || found.agreed) return
    setBusy(true)
    const result = await requestContributor({ area, reason })
    setBusy(false)
    if (!result.ok) setErrors(result.reason === 'invalid' ? { area: ERRORS.invalid } : { form: ERRORS[result.reason] })
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField
        label="Where do you travel or know well?"
        placeholder="Guiuan to Borongan, Eastern Samar"
        hint="Towns, barangays or the roads you use often."
        value={area}
        error={errors.area}
        maxLength={AREA_MAX}
        onChange={(v) => {
          setArea(v)
          setErrors((x) => ({ ...x, area: '', form: '' }))
        }}
      />
      <label className={page.field}>
        <span className={page.fieldLabel}>Why do you want to help? (optional)</span>
        <textarea
          className={`${page.input} ${styles.reason}`}
          value={reason}
          maxLength={REASON_MAX}
          rows={3}
          placeholder="I drive a tricycle in Guiuan every day."
          onChange={(e) => setReason(e.target.value)}
        />
        <span className={page.hint}>Only moderators see this.</span>
      </label>
      <div className={page.field}>
        <label className={auth.check}>
          <input
            type="checkbox"
            checked={agreed}
            aria-invalid={errors.agreed ? true : undefined}
            aria-describedby={errors.agreed ? 'agree-error' : undefined}
            onChange={(e) => {
              setAgreed(e.target.checked)
              setErrors((x) => ({ ...x, agreed: '' }))
            }}
          />
          <span>I&apos;ll only send what I&apos;ve seen myself, and I&apos;ll follow what Bulig asks above.</span>
        </label>
        {errors.agreed && (
          <span id="agree-error" className={page.error}>
            {errors.agreed}
          </span>
        )}
      </div>
      {errors.form && (
        <p className={page.error} role="alert">
          {errors.form}
        </p>
      )}
      <button type="submit" className={page.primaryButton} disabled={busy} aria-busy={busy}>
        <BusyContent busy={busy} busyLabel="Sending your request…">
          <PaperPlaneTilt size={18} aria-hidden="true" />
          Send my request
        </BusyContent>
      </button>
      <p className={page.hint}>A moderator answers on this page. We&apos;ll show it here when they do.</p>
    </form>
  )
}
