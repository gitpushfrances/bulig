import type { NewPlaceChanges } from '../contribute/store.ts'
import { API_URL, ApiError, OfflineError, apiRequest } from '../data/api.ts'
import { readSaved } from '../data/storage.ts'
import { localStaff } from './local.ts'
import type {
  AreaInput,
  Hotline,
  HotlineFilter,
  HotlineInput,
  Page,
  QueueItem,
  QueueStatus,
  RejectReason,
  StaffArea,
  StaffUser,
  StaffUserDetail,
  SubmissionDetail,
  SubmissionReason,
  Summary,
  WriteResult,
} from './types.ts'

// The moderator screens' requests (docs/API.md §7.8). Reads throw, and the snapshot cache
// (snapshot.ts) turns that into "couldn't load" while keeping the last good copy on screen. Writes
// never throw: they answer ok, or the words to show.

export interface QueueQuery {
  status?: QueueStatus
  reason?: SubmissionReason
  page?: number
}

export interface UserQuery {
  q?: string
  role?: string
  // Only people waiting on a "Become a contributor" answer, oldest first.
  requested?: boolean
  page?: number
}

export interface StaffStore {
  summary(): Promise<Summary>
  queue(query?: QueueQuery): Promise<Page<QueueItem>>
  submission(id: string): Promise<SubmissionDetail>
  approve(id: string, fields: string[], photos: string[]): Promise<WriteResult>
  confirm(id: string): Promise<WriteResult>
  reject(id: string, reason: RejectReason): Promise<WriteResult>
  rejectMany(ids: string[], reason: RejectReason): Promise<WriteResult<{ rejected: string[] }>>
  addPlace(place: NewPlaceChanges & { photoIds: string[] }): Promise<WriteResult<{ id: string }>>
  users(query?: UserQuery): Promise<Page<StaffUser>>
  user(id: string): Promise<StaffUserDetail>
  // Making a user a contributor also approves their waiting request.
  setRole(id: string, role: 'user' | 'contributor'): Promise<WriteResult<StaffUserDetail>>
  // "Not now" on a request: they may ask again in 30 days.
  declineContributor(id: string): Promise<WriteResult<StaffUserDetail>>
  removePhoto(id: string): Promise<WriteResult>
  areas(): Promise<StaffArea[]>
  saveArea(input: AreaInput, id?: string): Promise<WriteResult<StaffArea>>
  hotlines(filter?: HotlineFilter): Promise<Hotline[]>
  saveHotline(input: HotlineInput, id?: string): Promise<WriteResult<Hotline>>
  verifyHotline(id: string): Promise<WriteResult>
}

// The free server can take about a minute to wake (§7.8, "Waking up").
const STAFF_TIMEOUT_MS = 90_000
const TOKEN_KEY = 'bulig.token'

export function writeError(err: unknown): string {
  if (err instanceof OfflineError) return "It didn't go through. Check your signal and try again."
  if (err instanceof ApiError) {
    if (err.status === 422 && err.body.message) return err.message
    if (err.status === 403) return "Your account can't do that."
    if (err.status === 404) return 'This is gone. Someone may have removed it.'
    if (err.status === 401) return 'Your sign-in ended. Sign in again.'
  }
  return 'Something went wrong on the server. Try again.'
}

function query(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function createApiStaff(base: string, fetchFn: typeof fetch = (...args) => fetch(...args)): StaffStore {
  const call = <T>(path: string, init: Parameters<typeof apiRequest>[2] = {}) =>
    apiRequest<T>(base, `/staff${path}`, { token: readSaved(TOKEN_KEY), timeoutMs: STAFF_TIMEOUT_MS, ...init }, fetchFn)

  async function write<T>(run: () => Promise<T>): Promise<WriteResult<T>> {
    try {
      return { ok: true, value: await run() }
    } catch (err) {
      return { ok: false, message: writeError(err) }
    }
  }
  const done = async (p: Promise<unknown>) => {
    await p
  }

  return {
    summary: () => call<Summary>('/summary'),
    queue: ({ status, reason, page } = {}) => call<Page<QueueItem>>(`/submissions${query({ status, reason, page })}`),
    submission: (id) => call<SubmissionDetail>(`/submissions/${encodeURIComponent(id)}`),
    approve: (id, fields, photos) =>
      write(() =>
        done(
          call(`/submissions/${encodeURIComponent(id)}/approve`, {
            method: 'POST',
            body: { fields, photos },
          }),
        ),
      ),
    confirm: (id) =>
      write(() =>
        done(
          call(`/submissions/${encodeURIComponent(id)}/confirm`, {
            method: 'POST',
          }),
        ),
      ),
    reject: (id, reason) =>
      write(() =>
        done(
          call(`/submissions/${encodeURIComponent(id)}/reject`, {
            method: 'POST',
            body: { reason },
          }),
        ),
      ),
    rejectMany: (ids, reason) =>
      write(() =>
        call<{ rejected: string[] }>('/submissions/reject', {
          method: 'POST',
          body: { ids, reason },
        }),
      ),
    addPlace: (place) => write(() => call<{ id: string }>('/services', { method: 'POST', body: place })),
    users: ({ q, role, requested, page } = {}) =>
      call<Page<StaffUser>>(`/users${query({ q, role, requested: requested ? 1 : undefined, page })}`),
    user: (id) => call<StaffUserDetail>(`/users/${encodeURIComponent(id)}`),
    setRole: (id, role) =>
      write(() =>
        call<StaffUserDetail>(`/users/${encodeURIComponent(id)}/role`, {
          method: 'PATCH',
          body: { role },
        }),
      ),
    declineContributor: (id) =>
      write(() =>
        call<StaffUserDetail>(`/users/${encodeURIComponent(id)}/contributor-request/decline`, {
          method: 'POST',
        }),
      ),
    removePhoto: (id) => write(() => done(call(`/users/${encodeURIComponent(id)}/photo`, { method: 'DELETE' }))),
    areas: async () => (await call<{ items: StaffArea[] }>('/areas')).items,
    saveArea: (input, id) =>
      write(() =>
        call<StaffArea>(id ? `/areas/${encodeURIComponent(id)}` : '/areas', {
          method: id ? 'PATCH' : 'POST',
          body: input,
        }),
      ),
    hotlines: async ({ area, level, due } = {}) =>
      (await call<{ items: Hotline[] }>(`/emergency-contacts${query({ area, level, due })}`)).items,
    saveHotline: (input, id) =>
      write(() =>
        call<Hotline>(id ? `/emergency-contacts/${encodeURIComponent(id)}` : '/emergency-contacts', {
          method: id ? 'PATCH' : 'POST',
          body: input,
        }),
      ),
    verifyHotline: (id) =>
      write(() =>
        done(
          call(`/emergency-contacts/${encodeURIComponent(id)}/verify`, {
            method: 'POST',
            body: { source: 'called' },
          }),
        ),
      ),
  }
}

// Written with import.meta.env directly, like contribute/store.ts, so the API build drops the sample.
export const appStaff: StaffStore =
  import.meta.env.VITE_DATA_SOURCE === 'api' && import.meta.env.VITE_API_URL
    ? createApiStaff(API_URL ?? '')
    : localStaff
