import { CONTACT_KINDS, type AreaId, type EmergencyContact } from '../types.ts'

export const MAX_AGE_DAYS = 180
const DAY_MS = 24 * 60 * 60 * 1000

// A missing or unreadable date counts as expired: we only show numbers someone has checked.
export function isExpired(contact: EmergencyContact, now: Date): boolean {
  const checked = Date.parse(contact.verifiedAt)
  if (Number.isNaN(checked)) return true
  return now.getTime() - checked > MAX_AGE_DAYS * DAY_MS
}

function isNational(contact: EmergencyContact): boolean {
  return contact.kind === 'national' && contact.area === null
}

// The country's national number is always first and never hidden. Then the picked area's
// numbers and nationwide lines (all areas when none is picked), minus expired ones,
// sorted by kind and name. Runs on the phone because cached data ages while offline.
export function visibleContacts(
  contacts: EmergencyContact[],
  area: AreaId | null,
  now: Date,
): EmergencyContact[] {
  const national = contacts.filter(isNational)
  const local = contacts
    .filter((c) => !isNational(c))
    .filter((c) => area === null || c.area === null || c.area === area)
    .filter((c) => !isExpired(c, now))
    .sort(
      (a, b) =>
        CONTACT_KINDS.indexOf(a.kind) - CONTACT_KINDS.indexOf(b.kind) ||
        a.name.localeCompare(b.name),
    )
  return [...national, ...local]
}
