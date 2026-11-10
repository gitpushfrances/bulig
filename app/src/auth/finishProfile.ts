import { useState } from 'react'
import { readSaved, writeSaved } from '../data/storage.ts'
import type { Account } from './types.ts'

// "Finish your profile" (UI-UX.md, Profile). Signing up asks only for what an account needs (a name
// and an email; with Google, one tap). The rest waits until the person wants it. Only what helps
// counts as missing: a photo and the home area. The mobile number stays truly optional (RA 10173:
// don't nudge people into giving data Bulig doesn't use).
export function missingDetails(account: Account): ('photo' | 'homeArea')[] {
  const missing: ('photo' | 'homeArea')[] = []
  if (!account.photo) missing.push('photo')
  if (!account.homeArea?.trim()) missing.push('homeArea')
  return missing
}

const key = (email: string) => `bulig.finishProfile.${email}`

// Home's card can be closed for good on this phone; Profile's stays until the details are in.
export function useFinishProfile(account: Account | null) {
  const [closed, setClosed] = useState(() => (account ? readSaved(key(account.email)) === 'closed' : true))
  const missing = account ? missingDetails(account) : []
  return {
    missing,
    showOnHome: !!account && !closed && missing.length === 2,
    close: () => {
      if (account) writeSaved(key(account.email), 'closed')
      setClosed(true)
    },
  }
}

export function forgetFinishProfile(email: string) {
  writeSaved(key(email), null)
}
