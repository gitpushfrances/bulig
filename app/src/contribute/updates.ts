import { readSaved, writeSaved } from '../data/storage.ts'
import type { MySubmission, SubmissionStatus } from './store.ts'

// The bell (UI-UX.md, "Updates"): no push. On opening the app and on coming back to it, the phone
// reads GET /me/submissions and counts the ones whose review it hasn't shown yet.

const seenKey = (email: string) => `bulig.updatesSeen.${email}`

type Seen = Record<string, SubmissionStatus>

function readSeen(email: string): Seen {
  try {
    const v = JSON.parse(readSaved(seenKey(email)) ?? '{}') as unknown
    return v && typeof v === 'object' ? (v as Seen) : {}
  } catch {
    return {}
  }
}

// A reviewed submission the person hasn't looked at since its status changed.
export function unreadIds(email: string, items: MySubmission[]): string[] {
  const seen = readSeen(email)
  return items.filter((s) => s.status !== 'pending' && seen[s.id] !== s.status).map((s) => s.id)
}

export function markAllSeen(email: string, items: MySubmission[]): void {
  const seen = readSeen(email)
  for (const s of items) seen[s.id] = s.status
  writeSaved(seenKey(email), JSON.stringify(seen))
}

export const STATUS_TEXT: Record<SubmissionStatus, string> = {
  pending: 'Waiting',
  approved: 'Approved',
  partly_approved: 'Partly approved',
  rejected: 'Not added',
}

// One line under each update, in plain words.
export function statusDetail(s: MySubmission): string {
  if (s.status === 'pending') return 'A moderator will check it before anyone sees it.'
  if (s.status === 'rejected') return s.reviewNote ? `Reason: ${s.reviewNote}` : 'A moderator turned it down.'
  if (s.status === 'partly_approved') return 'Some of it is in. Phones see it within an hour.'
  return 'Phones see it within an hour.'
}
