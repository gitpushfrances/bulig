import { useSyncExternalStore } from 'react'
import type { Account } from '../auth/types.ts'
import { readSaved, writeSaved } from '../data/storage.ts'
import { can } from '../rules/permissions.ts'

// Moderators and admins see the staff app (Home with counts, Review, Add, Map, Manage). The
// "Use as a traveller" switch in Profile gives them the everyday tabs back for a drive; it is a
// per-phone convenience, so it lives in localStorage and holds no data.

const listeners = new Set<() => void>()
const keyFor = (email: string) => `bulig.traveller.${email}`

export function setTravellerMode(email: string, on: boolean): void {
  writeSaved(keyFor(email), on ? '1' : null)
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTravellerMode(email: string | undefined): boolean {
  return useSyncExternalStore(subscribe, () => !!email && readSaved(keyFor(email)) === '1')
}

// True when this account gets the staff screens right now.
export function useStaffView(account: Account | null): boolean {
  const traveller = useTravellerMode(account?.email)
  return can(account, 'review') && !traveller
}
