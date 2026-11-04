import { useEffect, useState, type ReactNode } from 'react'
import { readSaved, writeSaved } from '../data/storage.ts'
import { appAccounts } from './appAccounts.ts'
import { AuthContext } from './context.ts'
import type { AccountStore, NewAccount } from './store.ts'
import type { Account, ProfileDetails } from './types.ts'

const GUEST_KEY = 'bulig.guest'
const profileKey = (email: string) => `bulig.profile.${email}`

function readDetails(email: string): Partial<ProfileDetails> {
  try {
    return (JSON.parse(readSaved(profileKey(email)) ?? 'null') as Partial<ProfileDetails> | null) ?? {}
  } catch {
    return {}
  }
}

// The account plus what Edit profile keeps on this phone. With server accounts that is only the
// photo (uploads come later); with phone-only accounts it is every detail.
function withDetails(account: Account | null, store: AccountStore): Account | null {
  if (!account) return null
  const details = readDetails(account.email)
  if (store.online) return { ...account, photo: details.photo }
  return { ...account, ...details, name: details.name?.trim() || account.name }
}

export default function AuthProvider({ children, store = appAccounts }: { children: ReactNode; store?: AccountStore }) {
  const [account, setAccount] = useState(() => withDetails(store.restore(), store))
  // The hearts, tagged with whose they are, so a stale list never shows for another account.
  const [loaded, setLoaded] = useState<{ email: string; ids: string[] } | null>(null)
  const [guest, setGuest] = useState(() => !account && readSaved(GUEST_KEY) === '1')
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

  const start = (next: Account) => {
    writeSaved(GUEST_KEY, null)
    setGuest(false)
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

  const continueAsGuest = () => {
    writeSaved(GUEST_KEY, '1')
    setGuest(true)
  }

  const updateProfile = async (details: ProfileDetails) => {
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
    writeSaved(profileKey(account.email), JSON.stringify(store.online ? { photo: clean.photo } : clean))
    setAccount(withDetails(store.online ? result : { ...result, ...clean }, store))
    return 'ok' as const
  }

  const changePassword = (current: string, next: string) =>
    account ? store.changePassword(account, current, next) : Promise.resolve('wrong' as const)

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
        guest,
        continueAsGuest,
        signIn,
        register,
        signOut,
        updateProfile,
        changePassword,
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
