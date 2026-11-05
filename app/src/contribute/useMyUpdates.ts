import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/context.ts'
import { can } from '../rules/permissions.ts'
import { appContribute, type MySubmission } from './store.ts'
import { unreadIds } from './updates.ts'

// The signed-in contributor's updates, read on mount and again whenever the app comes back to the
// screen. Nothing for people who can't send updates. null items = not loaded (or couldn't be).
// Home mounts again on every visit; one read a minute is plenty, and keeps the free server quiet.
const FRESH_MS = 60_000
let cache: { email: string; at: number; items: MySubmission[] } | null = null

async function fetchMine(email: string, force: boolean): Promise<MySubmission[] | null> {
  if (!force && cache && cache.email === email && Date.now() - cache.at < FRESH_MS) return cache.items
  const items = await appContribute.mySubmissions()
  if (items) cache = { email, at: Date.now(), items }
  return items
}

// Tests start each case clean.
export function forgetMyUpdates(): void {
  cache = null
}

export function useMyUpdates() {
  const { account } = useAuth()
  const allowed = can(account, 'contribute')
  const email = account?.email ?? ''
  const [items, setItems] = useState<MySubmission[] | null>(() => (cache && cache.email === email ? cache.items : null))
  const [failed, setFailed] = useState(false)

  const apply = useCallback((result: MySubmission[] | null) => {
    if (result) {
      setItems(result)
      setFailed(false)
    } else setFailed(true)
  }, [])

  const reload = useCallback(() => fetchMine(email, true).then(apply), [apply, email])

  useEffect(() => {
    if (!allowed) return
    let live = true
    const load = (force: boolean) => fetchMine(email, force).then((r) => live && apply(r))
    void load(false)
    const onShow = () => document.visibilityState === 'visible' && void load(true)
    document.addEventListener('visibilitychange', onShow)
    return () => {
      live = false
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [allowed, apply, email])

  const unread = account && items ? unreadIds(account.email, items) : []
  return { allowed, items, failed, unread, reload }
}
