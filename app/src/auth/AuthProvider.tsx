import { useEffect, useState, type ReactNode } from 'react'
import { readSaved, writeSaved } from '../data/storage.ts'
import { appAccounts } from './appAccounts.ts'
import { AuthContext } from './context.ts'
import type { UpdateProfileResult } from './context.ts'
import type { AccountStore, NewAccount, SetPhotoResult } from './store.ts'
import type { Account, ProfileDetails } from './types.ts'

// Guest mode is gone (2026-11-04): Emergency is open to everyone without it. Old phones drop the flag.
const OLD_GUEST_KEY = 'bulig.guest'
const profileKey = (email: string) => `bulig.profile.${email}`

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
  const [loaded, setLoaded] = useState<{ email: string; ids: string[] } | null>(null)
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

  useEffect(() => {
    let live = true
    const current = email ? store.restore() : null
    if (current)
      void store.loadSaved(current).then((ids) => {
        if (live) setLoaded({ email: current.email, ids })
      })
    return () => {
      live = false
    }
  }, [email, store])
  const saved = loaded && loaded.email === email ? loaded.ids : []
  const setSaved = (update: (ids: string[]) => string[]) =>
    setLoaded((now) => (email ? { email, ids: update(now?.email === email ? now.ids : []) } : now))

  useEffect(() => writeSaved(OLD_GUEST_KEY, null), [])

  const start = (next: Account) => {
    setAccount(withDetails(next, store))
  }

  const signIn = async (address: string, password: string) => {
    const result = await store.signIn(address, password)
    if (result.ok) start(result.account)
    return result
  }

  const register = async (details: NewAccount) => {
    const result = await store.register(details)
    if (result.ok) start(result.account)
    return result
  }

  const signOut = () => {
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

  const changePassword = (current: string, next: string) =>
    account ? store.changePassword(account, current, next) : Promise.resolve('wrong' as const)

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
    setAccount(null)
    return true
  }

  // The heart flips at once; if the server says no, it flips back.
  const toggleSaved = (id: string) => {
    if (!account) return
    const on = !saved.includes(id)
    const next = on ? [...saved, id] : saved.filter((s) => s !== id)
    setSaved(() => next)
    void store.setSaved(account, id, on, next).then((ok) => {
      if (!ok) setSaved((now) => (on ? now.filter((s) => s !== id) : now.includes(id) ? now : [...now, id]))
    })
  }

  return (
    <AuthContext.Provider
      value={{
        account,
        signIn,
        register,
        signOut,
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
        toggleSaved,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
