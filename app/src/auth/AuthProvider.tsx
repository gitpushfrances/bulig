import { useEffect, useRef, useState, type ReactNode } from 'react'
import { smoothly } from '../motion.ts'
import { readSaved, writeSaved } from '../data/storage.ts'
import { appAccounts } from './appAccounts.ts'
import { forgetOnSignOut } from './forgetOnSignOut.ts'
import { forgetFinishProfile } from './finishProfile.ts'
import { AuthContext } from './context.ts'
import type { SavedStatus, UpdateProfileResult } from './context.ts'
import type { AccountStore, NewAccount, SaveResult, SetPhotoResult } from './store.ts'
import type { Account, ProfileDetails } from './types.ts'

// Guest mode is gone (2026-11-04): Emergency is open to everyone without it. Old phones drop the flag.
const OLD_GUEST_KEY = 'bulig.guest'
const profileKey = (email: string) => `bulig.profile.${email}`
// The last saved list from the server, for a fast start and offline (server accounts only; phone-only
// accounts keep theirs in bulig.saved.<email>).
const savedCacheKey = (email: string) => `bulig.savedCache.${email}`
// Hearts the server hasn't confirmed yet ({recordId: saved?}), kept on the phone so a heart tapped
// offline or while the free server wakes up is sent later, even after the app is closed.
const outboxKey = (email: string) => `bulig.savedOutbox.${email}`

function readOutbox(email: string): Record<string, boolean> {
  try {
    const value: unknown = JSON.parse(readSaved(outboxKey(email)) ?? 'null')
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([, on]) => typeof on === 'boolean')) as Record<string, boolean>
  } catch {
    return {}
  }
}

function applyOps(ids: string[], ops: Iterable<[string, boolean]>): string[] {
  let next = ids
  for (const [id, on] of ops) next = on ? (next.includes(id) ? next : [...next, id]) : next.filter((s) => s !== id)
  return next
}

// Waits before trying the saved list again after the server didn't answer.
const RETRY_MS = [5_000, 15_000, 45_000, 120_000]

interface Loaded {
  email: string
  ids: string[]
  status: SavedStatus
}

function cachedSaved(account: Account | null, store: AccountStore): Loaded | null {
  if (!account || !store.online) return null
  try {
    const ids: unknown = JSON.parse(readSaved(savedCacheKey(account.email)) ?? 'null')
    if (!Array.isArray(ids)) return null
    // Shown at once; the server's answer replaces it (or marks it stale if there is none).
    return { email: account.email, ids: ids.filter((v): v is string => typeof v === 'string'), status: 'ready' }
  } catch {
    return null
  }
}

function readDetails(email: string): Partial<ProfileDetails> {
  try {
    return (JSON.parse(readSaved(profileKey(email)) ?? 'null') as Partial<ProfileDetails> | null) ?? {}
  } catch {
    return {}
  }
}

// The account plus what Edit profile keeps on this phone. With server accounts the photo comes from
// the server (photoUrl); a photo picked before uploads existed shows until the next save sends it.
// With phone-only accounts it is every detail.
function withDetails(account: Account | null, store: AccountStore): Account | null {
  if (!account) return null
  const details = readDetails(account.email)
  if (store.online) return { ...account, photo: account.photo ?? details.photo }
  return { ...account, ...details, name: details.name?.trim() || account.name }
}

export default function AuthProvider({ children, store = appAccounts }: { children: ReactNode; store?: AccountStore }) {
  const [account, setAccount] = useState(() => withDetails(store.restore(), store))
  // The hearts, tagged with whose they are, so a stale list never shows for another account.
  const [loaded, setLoaded] = useState<Loaded | null>(() => cachedSaved(account, store))
  const email = account?.email ?? null

  // On start: ask the server who this is (a revoked token signs the phone out), then the hearts.
  useEffect(() => {
    let live = true
    void store.refresh().then((fresh) => {
      if (!live || fresh === undefined) return
      setAccount((current) => (fresh === null ? null : current ? withDetails(fresh, store) : current))
    })
    return () => {
      live = false
    }
  }, [store])

  const setSaved = (update: (ids: string[]) => string[]) =>
    setLoaded((now) =>
      email ? { email, ids: update(now?.email === email ? now.ids : []), status: now?.email === email ? now.status : 'loading' } : now,
    )

  const outbox = useRef<{ email: string | null; ops: Record<string, boolean> }>({ email: null, ops: {} })
  const ops = (who: string) => {
    if (outbox.current.email !== who) outbox.current = { email: who, ops: store.online ? readOutbox(who) : {} }
    return outbox.current.ops
  }
  const writeOps = (who: string) => {
    if (!store.online) return
    const pending = ops(who)
    writeSaved(outboxKey(who), Object.keys(pending).length ? JSON.stringify(pending) : null)
  }
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const flushing = useRef(false)
  const flushTimer = useRef(0)
  const flushFails = useRef(0)
  const scheduleFlush = (who: Account) => {
    window.clearTimeout(flushTimer.current)
    flushTimer.current = window.setTimeout(
      () => void flush(who),
      RETRY_MS[Math.min(flushFails.current++, RETRY_MS.length - 1)],
    )
  }
  // What the server said about one heart. A newer tap on the same place wins over an older answer.
  const settle = (who: Account, id: string, on: boolean, result: SaveResult) => {
    const pending = ops(who.email)
    if (pending[id] !== on) return
    if (result === 'retry') return scheduleFlush(who)
    delete pending[id]
    writeOps(who.email)
    if (result === 'ok') return
    setSaved((now) => applyOps(now, [[id, !on]]))
    setSavedNotice(on ? "Couldn't save that place: it may no longer be listed." : "Couldn't remove that place. Try again.")
  }
  // Sends the hearts still waiting, one by one; stops at the first that can't get through.
  const flush = async (who: Account) => {
    if (flushing.current || !store.online) return
    flushing.current = true
    try {
      for (const [id, on] of Object.entries(ops(who.email))) {
        const result = await store.setSaved(who, id, on, [])
        settle(who, id, on, result)
        if (result === 'retry') return
      }
      flushFails.current = 0
    } finally {
      flushing.current = false
    }
  }
  useEffect(() => () => window.clearTimeout(flushTimer.current), [])
  useEffect(() => {
    if (!savedNotice) return
    const timer = window.setTimeout(() => setSavedNotice(null), 5_000)
    return () => window.clearTimeout(timer)
  }, [savedNotice])

  // Then load the hearts. With server accounts the last list is kept on the phone, so Saved shows at
  // once (and offline); the server's answer replaces it. If the server doesn't answer (asleep, weak
  // signal), the phone's copy stays and it tries again after RETRY_MS, when the phone is back online
  // or the app comes back to the front, or when the person taps Try again.
  const [attempt, setAttempt] = useState(0)
  // Hearts tapped since a load started: its answer may predate them, so they are applied on top.
  const taps = useRef<{ n: number; id: string; on: boolean }[]>([])
  // Loads in a row that got no answer, for the wait before the next try.
  const failures = useRef(0)
  useEffect(() => {
    let live = true
    const current = email ? store.restore() : null
    if (!current) return
    let retry = 0
    const again = () => live && setAttempt((n) => n + 1)
    const since = taps.current.at(-1)?.n ?? 0
    void store.loadSaved(current).then((ids) => {
      if (!live) return
      if (ids === null) {
        setLoaded((now) =>
          now?.email === current.email ? { ...now, status: 'stale' } : { email: current.email, ids: [], status: 'error' },
        )
        retry = window.setTimeout(again, RETRY_MS[Math.min(failures.current++, RETRY_MS.length - 1)])
        return
      }
      failures.current = 0
      const tapped = taps.current.filter((t) => t.n > since).map((t) => [t.id, t.on] as [string, boolean])
      const next = applyOps(applyOps(ids, tapped), Object.entries(ops(current.email)))
      setLoaded({ email: current.email, ids: next, status: 'ready' })
      void flush(current)
    })
    const onBack = () => {
      if (document.visibilityState === 'visible' && failures.current > 0) again()
    }
    window.addEventListener('online', again)
    document.addEventListener('visibilitychange', onBack)
    return () => {
      live = false
      window.clearTimeout(retry)
      window.removeEventListener('online', again)
      document.removeEventListener('visibilitychange', onBack)
    }
    // flush and ops read refs only; the load reruns for a new account, store or attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, store, attempt])
  const mine = loaded && loaded.email === email ? loaded : null
  const saved = mine?.ids ?? []
  const savedStatus: SavedStatus = mine?.status ?? 'loading'
  // Keep the server's list on the phone for the next start.
  useEffect(() => {
    if (!store.online || !mine || mine.status === 'loading' || mine.status === 'error') return
    writeSaved(savedCacheKey(mine.email), JSON.stringify(mine.ids))
  }, [store.online, mine])

  useEffect(() => writeSaved(OLD_GUEST_KEY, null), [])

  const start = (next: Account) => {
    setAccount(withDetails(next, store))
  }

  const signIn = async (address: string, password: string) => {
    const result = await store.signIn(address, password)
    if (result.ok) start(result.account)
    return result
  }

  const signInWithGoogle = async (idToken: string) => {
    const result = await store.signInWithGoogle(idToken)
    if (result.ok) start(result.account)
    return result
  }

  const register = async (details: NewAccount) => {
    const result = await store.register(details)
    if (result.ok) start(result.account)
    return result
  }

  const signOut = () => {
    if (account) {
      writeSaved(savedCacheKey(account.email), null)
      writeSaved(outboxKey(account.email), null)
      // A server account's profile copy is only a photo that didn't upload; a phone-only account's
      // is the account itself, so it stays.
      if (store.online) writeSaved(profileKey(account.email), null)
      outbox.current = { email: null, ops: {} }
      forgetOnSignOut(account.email)
    }
    void store.signOut()
    setAccount(null)
  }

  const updateProfile = async (details: ProfileDetails): Promise<UpdateProfileResult> => {
    if (!account) return 'offline' as const
    const clean: ProfileDetails = {
      name: details.name.trim() || account.name,
      phone: details.phone?.trim() || undefined,
      homeArea: details.homeArea || null,
      photo: details.photo || undefined,
    }
    const result = await store.updateProfile(account, {
      name: clean.name,
      phone: clean.phone,
      homeArea: clean.homeArea ?? null,
    })
    if (result === 'offline' || result === 'invalid') return result
    // The photo has its own request, only when it changed. A photo only on this phone (picked before
    // uploads existed: a data URL while the server has none) is sent on this save too.
    let photo = store.online ? result.photo : account.photo
    let photoFailed: Exclude<SetPhotoResult, { ok: true }>['reason'] | null = null
    const unsent = store.online && !!clean.photo?.startsWith('data:')
    if (clean.photo !== account.photo || unsent) {
      const sent = await store.setPhoto(result, clean.photo ?? null)
      if (sent.ok) photo = sent.photo ?? undefined
      else photoFailed = sent.reason
    }
    writeSaved(
      profileKey(account.email),
      store.online ? (photoFailed ? JSON.stringify({ photo: account.photo }) : null) : JSON.stringify({ ...clean, photo }),
    )
    setAccount(withDetails(store.online ? { ...result, photo } : { ...result, ...clean, photo }, store))
    return photoFailed ? { photo: photoFailed } : ('ok' as const)
  }

  const changePassword = async (current: string, next: string) => {
    if (!account) return 'wrong' as const
    const result = await store.changePassword(account, current, next)
    // A Google account that just set its first password can now change its email too.
    if (result === 'ok' && account.hasPassword === false) setAccount({ ...account, hasPassword: true })
    return result
  }

  const requestEmailChange = async (newEmail: string, password: string) => {
    if (!account) return { ok: false as const, reason: 'offline' as const }
    const result = await store.requestEmailChange(account, newEmail, password)
    if (result.ok) setAccount(withDetails(result.account, store))
    return result
  }

  const cancelEmailChange = async () => {
    if (!account) return false
    const next = await store.cancelEmailChange(account)
    if (next) setAccount(withDetails(next, store))
    return !!next
  }

  const confirmEmail = async (token: string) => {
    const result = await store.confirmEmail(token)
    if (result.ok && account) {
      // This phone may be signed in to another account (the link opened elsewhere): only refresh, never swap.
      const fresh = await store.refresh()
      if (fresh) setAccount(withDetails(fresh, store))
    }
    return result
  }

  const deleteAccount = async () => {
    if (!account || !(await store.deleteAccount(account))) return false
    writeSaved(profileKey(account.email), null)
    forgetFinishProfile(account.email)
    writeSaved(savedCacheKey(account.email), null)
    writeSaved(outboxKey(account.email), null)
    outbox.current = { email: null, ops: {} }
    forgetOnSignOut(account.email)
    setAccount(null)
    return true
  }

  // The heart flips at once and stays. If the server didn't get it (offline, asleep), it waits in the
  // outbox and is sent again; only a clear "no" from the server (the place is gone) flips it back.
  const toggleSaved = (id: string) => {
    if (!account) return
    const on = !saved.includes(id)
    const next = on ? [...saved, id] : saved.filter((s) => s !== id)
    // On Saved, the card fades out and the rest glide up (motion.ts).
    smoothly(() => setSaved(() => next))
    const tap = { n: (taps.current.at(-1)?.n ?? 0) + 1, id, on }
    taps.current = [...taps.current.slice(-49), tap]
    ops(account.email)[id] = on
    writeOps(account.email)
    void store.setSaved(account, id, on, next).then((result) => {
      if (result === 'rejected') taps.current = taps.current.filter((t) => t !== tap)
      settle(account, id, on, result)
    })
  }

  return (
    <AuthContext.Provider
      value={{
        account,
        signIn,
        signInWithGoogle,
        register,
        signOut,
        refreshAccount: async () => {
          const fresh = await store.refresh()
          if (fresh === undefined) return
          setAccount((current) => (fresh === null ? null : current && current.email === fresh.email ? withDetails(fresh, store) : current))
        },
        updateProfile,
        changePassword,
        requestEmailChange,
        cancelEmailChange,
        confirmEmail,
        deleteAccount,
        canManage: !!account && store.canManage(account),
        accountsOnline: store.online,
        forgotPassword: (address) => store.forgotPassword(address),
        resetPassword: (address, token, password) => store.resetPassword(address, token, password),
        saved,
        savedStatus,
        savedNotice,
        retrySaved: () => {
          failures.current = 0
          setAttempt((n) => n + 1)
        },
        toggleSaved,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
