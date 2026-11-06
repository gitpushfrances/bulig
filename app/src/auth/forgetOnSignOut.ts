import { forgetDraft } from '../contribute/draft.ts'
import { forgetSeen } from '../contribute/updates.ts'
import { forgetMyUpdates } from '../contribute/useMyUpdates.ts'
import { writeSaved } from '../data/storage.ts'
import { ADDRESS_KEY } from '../location/address.ts'
import { dropMap, VIEW_KEY } from '../map/mapKeeper.ts'
import { ROUTE_KEY, SCOPE_KEY } from '../map/mapSession.ts'
import { forgetStaff } from '../staff/snapshot.ts'

// Phones get shared: a family's one Android, a borrowed phone at the roadside. After sign-out the
// next person must not find where this one was, where they were going, or what they sent.
//
// Kept on purpose: the theme, the country, the picked town (device settings, not a person's), and
// a phone-only account's own details (dev builds: on this phone they are the account itself).
export function forgetOnSignOut(email: string): void {
  // Where they were and where they were heading.
  writeSaved(ADDRESS_KEY, null)
  writeSaved(VIEW_KEY, null)
  try {
    sessionStorage.removeItem(ROUTE_KEY)
    sessionStorage.removeItem(SCOPE_KEY)
  } catch {
    // Blocked storage: nothing was kept there either.
  }
  // The Map tab's map, still at their last view and route in memory.
  dropMap()
  // What they sent and their half-written place.
  forgetSeen(email)
  forgetDraft(email)
  forgetMyUpdates()
  // Staff screens' copies of the queue, people, areas and hotlines (memory only, staff/snapshot.ts).
  forgetStaff()
}
