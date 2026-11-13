import { API_URL, ApiError, OfflineError, apiRequest } from '../data/api.ts'
import { readSaved, writeSaved } from '../data/storage.ts'

// Asking to become a Bulig Scout (the `contributor` role; docs/API.md §7.9). Two stores with one
// shape, like contribute/store.ts: the API when the build talks to the backend, else a copy kept on
// this phone so the flow can be tried in dev and tests. A moderator decides; nothing here changes
// the role by itself.

export type ScoutRequestStatus = 'pending' | 'approved' | 'declined'

// How they get around, so a moderator can tell a daily tricycle driver from a weekend rider.
export const TRAVEL = ['motorcycle', 'tricycle', 'car', 'jeepney', 'truck', 'bicycle', 'walk'] as const
export type Travel = (typeof TRAVEL)[number]
export const TRAVEL_LABELS: Record<Travel, string> = {
  motorcycle: 'Motorcycle',
  tricycle: 'Tricycle',
  car: 'Car',
  jeepney: 'Jeepney or van',
  truck: 'Truck',
  bicycle: 'Bicycle',
  walk: 'On foot',
}

export interface ScoutRequest {
  id: string
  status: ScoutRequestStatus
  // The barangay and town they know (free text, like Profile's home area).
  area: string
  travel: Travel[]
  why: string | null
  createdAt: string
  reviewedAt: string | null
  // Declined only: the moderator's words, shown to the person.
  reviewNote: string | null
  // Declined only: the date they may ask again (30 days after the answer).
  canApplyAgainAt: string | null
}

export interface ScoutApplication {
  area: string
  travel: Travel[]
  why?: string
}

// 'pending': a request is already waiting. 'already': the account is a Scout or staff.
// 'too_soon': declined less than 30 days ago (canApplyAgainAt says when).
export type ApplyResult =
  | { ok: true; request: ScoutRequest }
  | { ok: false; reason: 'offline' | 'invalid' | 'pending' | 'already' | 'too_soon' | 'busy'; canApplyAgainAt?: string }

export interface ScoutStore {
  // The latest request, null when they never asked (or withdrew). 'error' = couldn't load.
  myRequest(): Promise<ScoutRequest | null | 'error'>
  apply(application: ScoutApplication): Promise<ApplyResult>
  // Takes back a waiting request. False when the server didn't take it.
  withdraw(): Promise<boolean>
}

export const AREA_MAX = 120
export const WHY_MAX = 280

const TOKEN_KEY = 'bulig.token'
const PATH = '/me/contributor-request'

export function createApiScout(base: string, fetchFn: typeof fetch = (...args) => fetch(...args)): ScoutStore {
  const call = <T>(init: Parameters<typeof apiRequest>[2] = {}) =>
    apiRequest<T>(base, PATH, { token: readSaved(TOKEN_KEY), ...init }, fetchFn)

  return {
    async myRequest() {
      try {
        return (await call<{ request: ScoutRequest | null }>()).request ?? null
      } catch {
        return 'error'
      }
    },

    async apply({ area, travel, why }) {
      try {
        const { request } = await call<{ request: ScoutRequest }>({
          method: 'POST',
          // agreed: the Scout rules. adult: "I'm 18 or older", instead of asking for a birthday.
          body: { area: area.trim(), travel, ...(why?.trim() ? { why: why.trim() } : {}), agreed: true, adult: true },
        })
        return { ok: true, request }
      } catch (err) {
        if (err instanceof OfflineError) return { ok: false, reason: 'offline' }
        if (err instanceof ApiError) {
          if (err.status === 409) return { ok: false, reason: err.body.code === 'already_contributor' ? 'already' : 'pending' }
          if (err.status === 429) {
            const at = err.body.canApplyAgainAt
            return typeof at === 'string' ? { ok: false, reason: 'too_soon', canApplyAgainAt: at } : { ok: false, reason: 'busy' }
          }
          if (err.status === 422) return { ok: false, reason: 'invalid' }
          return { ok: false, reason: 'offline' }
        }
        throw err
      }
    },

    async withdraw() {
      try {
        await call({ method: 'DELETE' })
        return true
      } catch (err) {
        // Already gone (answered or withdrawn on another phone): nothing left to take back.
        return err instanceof ApiError && err.status === 404
      }
    },
  }
}

// Dev and tests: kept on this phone per account, waiting forever (there is no moderator here).
const localKey = (email: string) => `bulig.scoutRequest.${email}`

export function createLocalScout(email: () => string | null): ScoutStore {
  const read = (): ScoutRequest | null => {
    const who = email()
    if (!who) return null
    try {
      const v = JSON.parse(readSaved(localKey(who)) ?? 'null') as ScoutRequest | null
      return v && typeof v === 'object' && typeof v.status === 'string' ? v : null
    } catch {
      return null
    }
  }
  return {
    async myRequest() {
      return read()
    },
    async apply({ area, travel, why }) {
      const who = email()
      if (!who) return { ok: false, reason: 'offline' }
      if (read()?.status === 'pending') return { ok: false, reason: 'pending' }
      const request: ScoutRequest = {
        id: `scr_local_${Math.random().toString(36).slice(2, 10)}`,
        status: 'pending',
        area: area.trim(),
        travel,
        why: why?.trim() || null,
        createdAt: new Date().toISOString(),
        reviewedAt: null,
        reviewNote: null,
        canApplyAgainAt: null,
      }
      writeSaved(localKey(who), JSON.stringify(request))
      return { ok: true, request }
    },
    async withdraw() {
      const who = email()
      if (who) writeSaved(localKey(who), null)
      return true
    },
  }
}

// True when a declined person may ask again now.
export function canApplyAgain(request: ScoutRequest | null, now = new Date()): boolean {
  if (!request || request.status !== 'declined') return true
  return !request.canApplyAgainAt || new Date(request.canApplyAgainAt) <= now
}

export function createAppScout(email: () => string | null): ScoutStore {
  return import.meta.env.VITE_DATA_SOURCE === 'api' && import.meta.env.VITE_API_URL
    ? createApiScout(API_URL ?? '')
    : createLocalScout(email)
}

// The last answer, kept in memory only, so Profile can say "Waiting" without asking the server
// again. Dropped on sign-out (auth/forgetOnSignOut.ts).
let last: { email: string; request: ScoutRequest | null } | null = null

export function rememberScoutRequest(email: string, request: ScoutRequest | null): void {
  last = { email, request }
}

export function knownScoutRequest(email: string | undefined): ScoutRequest | null {
  return last && last.email === email ? last.request : null
}

export function forgetScoutRequest(): void {
  last = null
}
