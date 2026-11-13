import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/context.ts'

// Snapshots of what each moderator screen last loaded (John, 2026-11-06: "take snaps so it's smooth
// and doesn't load all the time"). Going back to a screen shows its last copy at once and refreshes
// it quietly when it is older than maxAge. Two requests for the same thing share one fetch.
//
// No leakage: snapshots live in this module's memory only, never in localStorage, sessionStorage or
// the offline cache. They belong to one account; another sign-in on the phone, or sign-out
// (forgetOnSignOut), drops them all. A reload starts empty.

interface Entry {
  data?: unknown
  at: number // when data arrived; 0 = stale
  loading: boolean
  failed: boolean
}

const entries = new Map<string, Entry>()
const listeners = new Set<() => void>()
let owner = ''
// Bumped on forget: an answer that arrives for the previous account is dropped.
let generation = 0

const DEFAULT_MAX_AGE_MS = 60_000

function emit() {
  for (const l of listeners) l()
}

function set(key: string, next: Entry) {
  entries.set(key, next)
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function forgetStaff(): void {
  entries.clear()
  generation += 1
  owner = ''
  emit()
}

function claim(email: string) {
  if (email === owner) return
  entries.clear()
  generation += 1
  owner = email
}

// Fetches unless a fresh copy is there or one is already on its way.
export function refresh(key: string, load: () => Promise<unknown>, maxAgeMs = DEFAULT_MAX_AGE_MS): void {
  const now = entries.get(key)
  if (now?.loading) return
  if (now?.data !== undefined && Date.now() - now.at < maxAgeMs) return
  const gen = generation
  set(key, { data: now?.data, at: now?.at ?? 0, loading: true, failed: false })
  load().then(
    (data) => {
      if (gen === generation) set(key, { data, at: Date.now(), loading: false, failed: false })
    },
    () => {
      if (gen !== generation) return
      const was = entries.get(key)
      set(key, {
        data: was?.data,
        at: was?.at ?? 0,
        loading: false,
        failed: true,
      })
    },
  )
}

// Warm a screen before it opens (a row's pointerdown), so it lands already drawn.
export const prefetch = refresh

// After a write: mark these stale, so the next visit refetches. Keeps showing the old copy meanwhile.
export function invalidate(...prefixes: string[]): void {
  for (const [key, e] of entries) if (prefixes.some((p) => key.startsWith(p))) entries.set(key, { ...e, at: 0 })
  emit()
}

// Change a snapshot in place (an approved item leaves the queue at once).
export function update<T>(key: string, change: (data: T) => T): void {
  const e = entries.get(key)
  if (e?.data !== undefined) set(key, { ...e, data: change(e.data as T) })
}

export interface Snapshot<T> {
  data: T | undefined
  // 'loading': nothing yet. 'failed': nothing, and the load failed. 'ready': data is there (maybe old).
  status: 'loading' | 'failed' | 'ready'
  // The last refresh failed, so data is the previous copy.
  stale: boolean
  refreshing: boolean
  reload: () => void
}

export function useSnapshot<T>(key: string | null, load: () => Promise<T>, maxAgeMs = DEFAULT_MAX_AGE_MS): Snapshot<T> {
  const { account } = useAuth()
  claim(account?.email ?? '')
  const entry = useSyncExternalStore(subscribe, () => (key ? entries.get(key) : undefined))
  const loadRef = useRef(load)
  useLayoutEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (!key) return
    refresh(key, () => loadRef.current(), maxAgeMs)
    // Back on the phone after a while: bring a stale copy up to date.
    const onShow = () => {
      if (document.visibilityState === 'visible') refresh(key, () => loadRef.current(), maxAgeMs)
    }
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [key, maxAgeMs])

  const reload = useCallback(() => {
    if (key) refresh(key, () => loadRef.current(), 0)
  }, [key])

  const data = entry?.data as T | undefined
  return {
    data,
    status: data !== undefined ? 'ready' : entry?.failed ? 'failed' : 'loading',
    stale: data !== undefined && !!entry?.failed,
    refreshing: !!entry?.loading,
    reload,
  }
}
