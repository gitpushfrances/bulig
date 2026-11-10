import { appStaff } from './api.ts'
import { useSnapshot } from './snapshot.ts'
import type { QueueStatus } from './types.ts'

// One snapshot key per screen's data. Writes call invalidate() with these prefixes.
export const KEYS = {
  summary: 'summary',
  queue: (status: QueueStatus) => `queue:${status}`,
  submission: (id: string) => `sub:${id}`,
  users: (q: string) => `users:${q}`,
  user: (id: string) => `user:${id}`,
  areas: 'areas',
  hotlines: 'hotlines',
} as const

// The tab badge and Home share this one small request.
export const useSummary = (enabled = true) => useSnapshot(enabled ? KEYS.summary : null, () => appStaff.summary())

export const useQueue = (status: QueueStatus) => useSnapshot(KEYS.queue(status), () => appStaff.queue({ status }))

export const useSubmission = (id: string | undefined) =>
  // Signed photo links last about an hour; 5 minutes keeps them well inside it.
  useSnapshot(id ? KEYS.submission(id) : null, () => appStaff.submission(id ?? ''), 5 * 60_000)

// Under 3 letters asks for the newest 20 (no search), so typing "a" never lists everybody.
// `requested`: only people waiting on a "Become a contributor" answer.
export const useUsers = (q: string, requested = false) => {
  const needle = q.trim().length >= 3 ? q.trim().toLowerCase() : ''
  return useSnapshot(KEYS.users(`${requested ? 'requested:' : ''}${needle}`), () =>
    appStaff.users({ q: needle || undefined, requested: requested || undefined }),
  )
}

export const useStaffUser = (id: string | undefined) =>
  useSnapshot(id ? KEYS.user(id) : null, () => appStaff.user(id ?? ''))

// Areas and hotlines change rarely: 5 minutes. The chips on Hotlines filter this one list on the
// phone, so switching Province / City / To check never waits for the server.
export const useStaffAreas = () => useSnapshot(KEYS.areas, () => appStaff.areas(), 5 * 60_000)
export const useHotlines = () => useSnapshot(KEYS.hotlines, () => appStaff.hotlines(), 5 * 60_000)
