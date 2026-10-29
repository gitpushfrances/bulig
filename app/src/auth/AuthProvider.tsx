import { useState, type ReactNode } from 'react'
import { readSaved, writeSaved } from '../data/storage.ts'
import { AuthContext } from './context.ts'
import {
  changeLocalPassword,
  checkLocalLogin,
  deleteLocalAccount,
  isLocalAccount,
  localAccountFor,
  register as registerLocal,
  renameLocalAccount,
  type NewAccount,
} from './localAccounts.ts'
import { accountFor, checkLogin } from './testAccount.ts'
import type { Account, ProfileDetails } from './types.ts'

const SESSION_KEY = 'bulig.session'
const GUEST_KEY = 'bulig.guest'
const savedKey = (email: string) => `bulig.saved.${email}`
const profileKey = (email: string) => `bulig.profile.${email}`

function readJson<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(readSaved(key) ?? 'null') as T | null) ?? fallback
  } catch {
    return fallback
  }
}

function readList(key: string): string[] {
  const value = readJson<unknown>(key, [])
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

// The account plus whatever the person added in Edit profile (phone, home area, a new name).
function withDetails(account: Account | null): Account | null {
  if (!account) return null
  const details = readJson<Partial<ProfileDetails>>(profileKey(account.email), {})
  return { ...account, ...details, name: details.name?.trim() || account.name }
}

function sessionAccount(): Account | null {
  const email = readSaved(SESSION_KEY)
  return withDetails(accountFor(email) ?? localAccountFor(email))
}

// Keeps the signed-in account and its saved places on this phone only (localStorage).
// Phase 4 swaps the test and local accounts for the API; pages keep using useAuth() unchanged.
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState(sessionAccount)
  const [saved, setSaved] = useState(() => (account ? readList(savedKey(account.email)) : []))
  const [guest, setGuest] = useState(() => !account && readSaved(GUEST_KEY) === '1')

  const start = (next: Account) => {
    writeSaved(SESSION_KEY, next.email)
    writeSaved(GUEST_KEY, null)
    setGuest(false)
    setAccount(withDetails(next))
    setSaved(readList(savedKey(next.email)))
  }

  const signIn = async (email: string, password: string) => {
    const next = checkLogin(email, password) ?? (await checkLocalLogin(email, password))
    if (!next) return false
    start(next)
    return true
  }

  const register = async (details: NewAccount) => {
    const result = await registerLocal(details)
    if (result.ok) start(result.account)
    return result
  }

  const signOut = () => {
    writeSaved(SESSION_KEY, null)
    setAccount(null)
    setSaved([])
  }

  const continueAsGuest = () => {
    writeSaved(GUEST_KEY, '1')
    setGuest(true)
  }

  const updateProfile = (details: ProfileDetails) => {
    if (!account) return
    const clean: ProfileDetails = {
      name: details.name.trim() || account.name,
      phone: details.phone?.trim() || undefined,
      homeArea: details.homeArea || null,
      photo: details.photo || undefined,
    }
    writeSaved(profileKey(account.email), JSON.stringify(clean))
    if (isLocalAccount(account.email)) renameLocalAccount(account.email, clean.name)
    setAccount({ ...account, ...clean })
  }

  const changePassword = (current: string, next: string) =>
    account ? changeLocalPassword(account.email, current, next) : Promise.resolve(false)

  const deleteAccount = () => {
    if (!account || !isLocalAccount(account.email)) return
    deleteLocalAccount(account.email)
    writeSaved(savedKey(account.email), null)
    writeSaved(profileKey(account.email), null)
    signOut()
  }

  const toggleSaved = (id: string) => {
    if (!account) return
    const next = saved.includes(id) ? saved.filter((s) => s !== id) : [...saved, id]
    setSaved(next)
    writeSaved(savedKey(account.email), JSON.stringify(next))
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
        isLocal: !!account && isLocalAccount(account.email),
        saved,
        toggleSaved,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
