import type { Account } from '../auth/types.ts'
import type { Area, AreaId } from '../types.ts'

// What each role may do. See docs/WORKFLOW.md, "Roles". Emergency Help is never here:
// it needs no account in any phase.
// contribute = send Update details and add a new place (API.md §7.2); review and verify = the staff
// requests in API.md §7.8.
export const ACTIONS = ['save', 'report', 'contribute', 'review', 'verify', 'manage_areas', 'manage_accounts'] as const
export type Action = (typeof ACTIONS)[number]

const ROLE_ACTIONS: Record<Account['role'], readonly Action[]> = {
  user: ['save', 'report'],
  contributor: ['save', 'report', 'contribute'],
  moderator: ['save', 'report', 'contribute', 'review', 'verify'],
  admin: ACTIONS,
}

// Actions that only make sense for one area. A moderator may do them inside their own areas.
const AREA_ACTIONS: readonly Action[] = ['review', 'verify']

// True when `area` is `scope` or sits inside it (a barangay inside its municipality).
export function isWithin(area: AreaId, scope: AreaId, areas: Area[]): boolean {
  const byId = new Map(areas.map((a) => [a.id, a]))
  const seen = new Set<AreaId>()
  let current: AreaId | null | undefined = area
  while (current && !seen.has(current)) {
    if (current === scope) return true
    seen.add(current) // a loop in bad data must not hang the phone
    current = byId.get(current)?.parent
  }
  return false
}

export function can(account: Account | null, action: Action, area?: AreaId | null, areas: Area[] = []): boolean {
  if (!account || !ROLE_ACTIONS[account.role].includes(action)) return false
  if (account.role !== 'moderator' || !AREA_ACTIONS.includes(action)) return true
  // A moderator with no areas covers the whole country (API.md §7.8, WORKFLOW.md "for now,
  // everywhere"). The server decides for real; this only picks what the screens show.
  if (account.areas.length === 0) return true
  // Otherwise they act on one area at a time, and only inside the areas they look after.
  return !!area && account.areas.some((scope) => isWithin(area, scope, areas))
}
