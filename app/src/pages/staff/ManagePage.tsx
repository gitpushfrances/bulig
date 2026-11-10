import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ROLE_LABELS } from '../../auth/types.ts'
import { formatDate } from '../../data/format.ts'
import { kindLabel } from '../../data/labels.ts'
import { appStaff } from '../../staff/api.ts'
import { initials, localPhone } from '../../staff/format.ts'
import { KEYS, useHotlines, useStaffAreas, useSummary, useUsers } from '../../staff/hooks.ts'
import { prefetch } from '../../staff/snapshot.ts'
import { AREA_LEVELS, type Hotline } from '../../staff/types.ts'
import page from '../Page.module.css'
import { Loaded } from './common.tsx'
import styles from './Staff.module.css'

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'areas', label: 'Areas' },
  { id: 'hotlines', label: 'Hotlines' },
] as const
type TabId = (typeof TABS)[number]['id']

// Manage (John, 2026-11-06): people, areas and local hotlines, as the backend allows a moderator.
// The section is in the URL, so Back returns to the same one.
export default function ManagePage() {
  const [params, setParams] = useSearchParams()
  const tab: TabId = TABS.some((t) => t.id === params.get('tab')) ? (params.get('tab') as TabId) : 'users'
  const notice = (useLocation().state as { notice?: string } | null)?.notice

  return (
    <section className={page.page} aria-labelledby="manage-title">
      <h1 id="manage-title" className={page.title}>
        Manage
      </h1>
      <div className={styles.seg} role="group" aria-label="Section">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() =>
              setParams(t.id === 'users' ? {} : { tab: t.id }, {
                replace: true,
              })
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {notice && (
        <p className={styles.status} role="status">
          {notice}
        </p>
      )}
      {tab === 'users' && <Users />}
      {tab === 'areas' && <Areas />}
      {tab === 'hotlines' && (
        <Hotlines
          show={params.get('show')}
          onShow={(s) =>
            setParams(s ? { tab: 'hotlines', show: s } : { tab: 'hotlines' }, {
              replace: true,
            })
          }
        />
      )}
    </section>
  )
}

function useDebounced(value: string, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function Users() {
  const [q, setQ] = useState('')
  const [params, setParams] = useSearchParams()
  // "Asked to contribute": the people waiting on Profile > Become a contributor (kept in the URL).
  const requested = params.get('show') === 'requests'
  const typed = useDebounced(q, 300)
  const users = useUsers(typed, requested)
  const summary = useSummary()
  const waiting = summary.data?.contributorRequests ?? 0
  const short = q.trim().length > 0 && q.trim().length < 3

  return (
    <>
      <div className={styles.chips} role="group" aria-label="Show">
        <button
          type="button"
          className={page.filterChip}
          aria-pressed={!requested}
          onClick={() => setParams({}, { replace: true })}
        >
          Everyone
        </button>
        <button
          type="button"
          className={page.filterChip}
          aria-pressed={requested}
          onClick={() => setParams({ show: 'requests' }, { replace: true })}
        >
          Asked to contribute{waiting > 0 ? ` (${waiting})` : ''}
        </button>
      </div>
      <label className={page.field}>
        <span className="visually-hidden">Search people</span>
        <input
          className={page.input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a name or email"
          autoComplete="off"
        />
      </label>
      <p className={page.hint}>
        {short
          ? 'Type 3 letters or more.'
          : requested
            ? 'Oldest first. Open one to read their request and answer it.'
            : 'Newest first, 20 at a time. Emails are shortened to protect people.'}
      </p>
      <Loaded snap={users} what="people" rows={4}>
        {({ items }) =>
          items.length ? (
            <ul className={styles.list}>
              {items.map((u) => (
                <li key={u.id}>
                  <Link
                    to={`/manage/users/${encodeURIComponent(u.id)}`}
                    className={styles.row}
                    onPointerDown={() => prefetch(KEYS.user(u.id), () => appStaff.user(u.id))}
                  >
                    <span className={styles.thumb} aria-hidden="true">
                      {initials(u.name)}
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.rowName}>{u.name}</span>
                      <span className={styles.rowMeta}>
                        {u.email} · {u.sent} sent
                      </span>
                    </span>
                    <span
                      className={`${styles.pill} ${u.requested ? styles.due : u.role === 'user' ? styles.grey : u.role === 'contributor' ? '' : styles.flag}`}
                    >
                      {u.requested ? 'Asked' : ROLE_LABELS[u.role]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={page.hint}>{requested ? 'Nobody is waiting for an answer.' : 'Nobody by that name.'}</p>
          )
        }
      </Loaded>
    </>
  )
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

const levelOrder = (level?: string) => {
  const i = AREA_LEVELS.indexOf((level ?? '') as (typeof AREA_LEVELS)[number])
  return i < 0 ? AREA_LEVELS.length : i
}

function Areas() {
  const areas = useStaffAreas()
  return (
    <>
      <Loaded snap={areas} what="areas" rows={3}>
        {(items) => (
          <ul className={styles.list}>
            {[...items]
              .sort((a, b) => levelOrder(a.level) - levelOrder(b.level) || a.name.localeCompare(b.name))
              .map((a) => (
                <li key={a.id}>
                  <Link to={`/manage/areas/${encodeURIComponent(a.id)}`} className={styles.row}>
                    <span className={styles.thumb} aria-hidden="true">
                      {initials(a.name)}
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.rowName}>{a.name}</span>
                      <span className={styles.rowMeta}>
                        {a.level ?? 'area'} · {plural(a.places, 'place')} · {plural(a.hotlines, 'hotline')}
                      </span>
                    </span>
                    <span className={page.more}>Edit</span>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </Loaded>
      <Link to="/manage/areas/new" className={page.secondary}>
        Add an area
      </Link>
      <p className={page.hint}>Only an admin can delete an area, and only one nothing uses.</p>
    </>
  )
}

const HOTLINE_FILTERS = [
  { id: '', label: 'All' },
  { id: 'due', label: 'To check' },
  { id: 'province', label: 'Province' },
  { id: 'city', label: 'City' },
  { id: 'municipality', label: 'Municipality' },
]

// Hides from everyone within 30 days, or already hidden.
function isDue(h: Hotline, now = Date.now()): boolean {
  return h.hidden || Date.parse(h.hidesOn) - now < 30 * 86_400_000
}

function hotlineStatus(h: Hotline, now = Date.now()): { text: string; tone: string } {
  if (h.hidden) return { text: 'Hidden', tone: styles.grey }
  const days = Math.ceil((Date.parse(h.hidesOn) - now) / 86_400_000)
  if (days <= 30) return { text: `Hides in ${days} days`, tone: styles.due }
  return { text: `Checked ${formatDate(h.verifiedAt)}`, tone: styles.ok }
}

function Hotlines({ show, onShow }: { show: string | null; onShow: (s: string) => void }) {
  const hotlines = useHotlines()
  const filter = show ?? ''
  return (
    <>
      <div className={styles.chips} role="group" aria-label="Show">
        {HOTLINE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={page.filterChip}
            aria-pressed={filter === f.id}
            onClick={() => onShow(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <Loaded snap={hotlines} what="hotlines" rows={4}>
        {(items) => {
          const shown = items
            .filter((h) => (filter === 'due' ? isDue(h) : !filter || h.areaLevel === filter))
            .sort(
              (a, b) =>
                levelOrder(a.areaLevel) - levelOrder(b.areaLevel) ||
                a.areaName.localeCompare(b.areaName) ||
                a.name.localeCompare(b.name),
            )
          if (!shown.length)
            return <p className={page.hint}>{filter === 'due' ? 'Nothing to check. Nice.' : 'No hotlines here yet.'}</p>
          const groups = [...new Set(shown.map((h) => h.area))]
          return groups.map((area) => {
            const inArea = shown.filter((h) => h.area === area)
            return (
              <div key={area} className={page.section}>
                <h2 className={styles.group}>
                  {inArea[0].areaName} · {inArea[0].areaLevel}
                </h2>
                <ul className={styles.list}>
                  {inArea.map((h) => {
                    const s = hotlineStatus(h)
                    return (
                      <li key={h.id}>
                        <Link to={`/manage/hotlines/${encodeURIComponent(h.id)}`} className={styles.row}>
                          <span className={styles.rowText}>
                            <span className={styles.rowName}>{h.name}</span>
                            <span className={styles.rowMeta}>
                              {kindLabel(h.kind)} · {h.phones.map(localPhone).join(', ')}
                            </span>
                          </span>
                          <span className={`${styles.pill} ${s.tone}`}>{s.text}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })
        }}
      </Loaded>
      <Link to="/manage/hotlines/new" className={page.secondary}>
        Add a hotline
      </Link>
      <p className={page.hint}>
        Local numbers hide from everyone after 180 days unchecked. Call before you mark one checked. 911 and other
        national lines are changed by an admin only. Only an admin deletes a hotline.
      </p>
    </>
  )
}
