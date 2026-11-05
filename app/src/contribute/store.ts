import { API_URL, ApiError, OfflineError, apiRequest } from '../data/api.ts'
import { readSaved, writeSaved } from '../data/storage.ts'
import type { AreaId, Category, Feature, WeeklyHours } from '../types.ts'

// Update details and new places (docs/API.md §7.1 to §7.3). Two stores with one shape, like the
// account stores: the API when the build talks to the backend, else a copy kept on this phone so
// the flow can be tried in dev and tests. Nothing sent is public until a moderator approves it.

export type PhotoSource = 'camera' | 'gallery'

// The fields a new place sends in `changes` (§7.2). Only what the person filled in.
export interface NewPlaceChanges {
  name: string
  category: Category
  area: AreaId
  landmark: string
  lat: number
  lng: number
  subtype?: string
  phone?: string
  weeklyHours?: WeeklyHours
  open24h?: boolean
  features?: Partial<Record<Feature, boolean>>
}

export interface NewPlaceSubmission {
  changes: NewPlaceChanges
  photoIds: string[]
  note?: string
  seenAt: string
}

export type SubmissionStatus = 'pending' | 'approved' | 'partly_approved' | 'rejected'

// One row of GET /me/submissions (§7.3).
export interface MySubmission {
  id: string
  recordId: string | null
  recordName: string
  reason: string
  status: SubmissionStatus
  approvedFields?: string[]
  reviewNote: string | null
  createdAt: string
  reviewedAt: string | null
}

// 'invalid': not an image or too big. 'busy': 30 photos a day used. 'unavailable': photo storage
// isn't set up on the server.
export type UploadResult = { ok: true; id: string } | { ok: false; reason: 'offline' | 'invalid' | 'busy' | 'unavailable' }

// 'busy': 10 a day used. 'closed': submissions are switched off (423). 'forbidden': this account
// can't add places. 'photo': a photo expired or was used; send it again. 'invalid': a field rule.
export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'offline' | 'busy' | 'closed' | 'forbidden' | 'photo' | 'invalid' }

export interface ContributeStore {
  uploadPhoto(photo: Blob, source: PhotoSource): Promise<UploadResult>
  submitNewPlace(submission: NewPlaceSubmission): Promise<SubmitResult>
  // Newest first. null = couldn't load (offline, server asleep).
  mySubmissions(): Promise<MySubmission[] | null>
}

const TOKEN_KEY = 'bulig.token'

export function createApiContribute(base: string, fetchFn: typeof fetch = (...args) => fetch(...args)): ContributeStore {
  const call = <T>(path: string, init: Parameters<typeof apiRequest>[2] = {}) =>
    apiRequest<T>(base, path, { token: readSaved(TOKEN_KEY), ...init }, fetchFn)

  return {
    async uploadPhoto(photo, source) {
      const form = new FormData()
      form.append('photo', photo, photo.type === 'image/jpeg' ? 'photo.jpg' : 'photo.webp')
      form.append('source', source)
      try {
        const { id } = await call<{ id: string }>('/uploads', { method: 'POST', body: form })
        return { ok: true, id }
      } catch (err) {
        if (err instanceof OfflineError) return { ok: false, reason: 'offline' }
        if (err instanceof ApiError && err.status === 429) return { ok: false, reason: 'busy' }
        if (err instanceof ApiError && err.status === 503) return { ok: false, reason: 'unavailable' }
        if (err instanceof ApiError && [413, 415, 422].includes(err.status)) return { ok: false, reason: 'invalid' }
        if (err instanceof ApiError) return { ok: false, reason: 'unavailable' }
        throw err
      }
    },

    async submitNewPlace({ changes, photoIds, note, seenAt }) {
      try {
        const { id } = await call<{ id: string }>('/submissions', {
          method: 'POST',
          body: { recordType: 'service', reason: 'new_place', changes, photoIds, seenAt, ...(note ? { note } : {}) },
        })
        return { ok: true, id }
      } catch (err) {
        if (err instanceof OfflineError) return { ok: false, reason: 'offline' }
        if (err instanceof ApiError) {
          if (err.status === 429) return { ok: false, reason: 'busy' }
          if (err.status === 423) return { ok: false, reason: 'closed' }
          if (err.status === 403) return { ok: false, reason: 'forbidden' }
          if (err.status === 422)
            return {
              ok: false,
              reason: Object.keys(err.fieldErrors()).some((k) => k.startsWith('photoIds')) ? 'photo' : 'invalid',
            }
          return { ok: false, reason: 'offline' }
        }
        throw err
      }
    },

    async mySubmissions() {
      try {
        return (await call<{ items: MySubmission[] }>('/me/submissions')).items
      } catch {
        return null
      }
    },
  }
}

// Dev and tests: everything stays on this phone, waiting forever (there is no moderator here).
const LOCAL_KEY = 'bulig.localSubmissions'

function readLocal(): MySubmission[] {
  try {
    const v = JSON.parse(readSaved(LOCAL_KEY) ?? '[]') as unknown
    return Array.isArray(v) ? (v as MySubmission[]) : []
  } catch {
    return []
  }
}

export const localContribute: ContributeStore = {
  async uploadPhoto() {
    return { ok: true, id: `upl_local_${Math.random().toString(36).slice(2, 10)}` }
  },
  async submitNewPlace({ changes }) {
    const item: MySubmission = {
      id: `sub_local_${Math.random().toString(36).slice(2, 10)}`,
      recordId: null,
      recordName: changes.name,
      reason: 'new_place',
      status: 'pending',
      reviewNote: null,
      createdAt: new Date().toISOString(),
      reviewedAt: null,
    }
    writeSaved(LOCAL_KEY, JSON.stringify([item, ...readLocal()]))
    return { ok: true, id: item.id }
  },
  async mySubmissions() {
    return readLocal()
  },
}

// Written with import.meta.env directly, like appAccounts.ts, so the API build drops the local one.
export const appContribute: ContributeStore =
  import.meta.env.VITE_DATA_SOURCE === 'api' && import.meta.env.VITE_API_URL
    ? createApiContribute(API_URL ?? '')
    : localContribute
