import type { Role } from '../auth/types.ts'
import type { Area, AreaId, ContactKind, EmergencyContact } from '../types.ts'

// The staff answers in docs/API.md §7.8, as the app reads them. Only what the moderator screens
// show: no full email, mobile, home area or saved places ever reaches the phone.

export type SubmissionReason =
  | 'changed'
  | 'new_place'
  | 'number_not_working'
  | 'closed_for_good'
  | 'wrong_location'
  | 'duplicate'
  | 'other'

export type QueueStatus = 'pending' | 'approved' | 'partly_approved' | 'rejected' | 'confirmed'

export interface Summary {
  pendingSubmissions: number
  places: number
  hiddenEmergencyContacts: number
  dueEmergencyContacts: number
  users: number
  // People waiting for an answer on "Become a Bulig Scout" (§7.9). Missing on an older server.
  scoutRequests?: number
}

export interface QueueItem {
  id: string
  recordType: 'service' | 'emergency_contact'
  recordId: string | null
  recordName: string
  reason: SubmissionReason
  status: QueueStatus
  area: AreaId
  sender: { id: string; name: string }
  photoCount: number
  createdAt: string
  canReview: boolean
}

export interface Page<T> {
  items: T[]
  nextPage: number | null
}

export interface ReviewField {
  key: string
  current: unknown
  proposed: unknown
}

export interface ReviewPhoto {
  id: string
  url: string
  expiresAt: string
  source: 'camera' | 'gallery'
}

export interface SubmissionDetail extends Omit<QueueItem, 'sender' | 'photoCount'> {
  sender: { id: string; name: string; role: Role }
  seenAt: string
  note: string | null
  fields: ReviewField[]
  photos: ReviewPhoto[]
  reviewNote: string | null
}

export const REJECT_REASONS = {
  could_not_confirm: 'Could not confirm it',
  photo_mismatch: 'The photo does not show it',
  wrong_place: 'Wrong place',
  up_to_date: 'Already up to date',
  duplicate: 'Duplicate',
  not_road_help: 'Not a place for road help',
} as const
export type RejectReason = keyof typeof REJECT_REASONS

export interface StaffUser {
  id: string
  name: string
  role: Role
  email: string // masked by the server: "ju…@gmail.com"
  createdAt: string
  sent: number
  // True while they have a "Become a Bulig Scout" request waiting (§7.9).
  asked?: boolean
}

// A waiting "Become a Bulig Scout" request, as staff see it.
export interface StaffScoutRequest {
  area: string
  travel: string[]
  why: string | null
  createdAt: string
}

export interface StaffUserDetail extends StaffUser {
  approved: number
  photoUrl: string | null
  canChangeRole: boolean
  canRemovePhoto: boolean
  scoutRequest?: StaffScoutRequest | null
}

export const AREA_LEVELS = ['province', 'city', 'municipality', 'barangay'] as const
export type AreaLevel = (typeof AREA_LEVELS)[number]

export interface StaffArea extends Area {
  places: number
  hotlines: number
  inUse: boolean
}

export interface AreaInput {
  name: string
  level: AreaLevel
  parent: AreaId | null
  region: string
}

export type LocalKind = Exclude<ContactKind, 'national'>
export const LOCAL_KINDS: readonly LocalKind[] = ['police', 'fire', 'medical', 'rescue', 'coast_guard', 'disaster']

export interface Hotline extends EmergencyContact {
  areaName: string
  areaLevel: string
  hidden: boolean
  hidesOn: string
}

export interface HotlineInput {
  area: AreaId
  kind: LocalKind
  name: string
  phones: string[]
  source: string
  checkedToday: boolean
}

export interface HotlineFilter {
  area?: AreaId
  level?: string
  due?: number
}

// Writes: ok, or the words to show. 'offline' covers a sleeping server too.
export type WriteResult<T = void> = { ok: true; value: T } | { ok: false; message: string }
