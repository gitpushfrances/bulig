import { useState, type ReactNode } from 'react'
import { readSaved, writeSaved } from '../data/storage.ts'
import { AuthContext } from './context.ts'
import { checkLocalLogin, localAccountFor, register as registerLocal, type NewAccount } from './localAccounts.ts'
import { accountFor, checkLogin } from './testAccount.ts'
import type { Account } from './types.ts'

const SESSION_KEY = 'bulig.session'
const WELCOMED_KEY = 'bulig.welcomed'
const savedKey = (email: string) => `bulig.saved.${email}`

function readList(key: string): string[] {
  try {
    const value: unknown = JSON.parse(readSaved(key) ?? '[]')
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function sessionAccount(): Account | null {
  const email = readSaved(SESSION_KEY)
  return accountFor(email) ?? localAccountFor(email)
}

// Keeps the signed-in account and its saved places on this phone only (localStorage).
// Phase 4 swaps the test and local accounts for the API; pages keep using useAuth() unchanged.
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState(sessionAccount)
  const [saved, setSaved] = useState(() => (account ? readList(savedKey(account.email)) : []))
  const [welcomed, setWelcomed] = useState(() => readSaved(WELCOMED_KEY) === '1')

  const markWelcomed = () => {
    writeSaved(WELCOMED_KEY, '1')
    setWelcomed(true)
  }

  const start = (next: Account) => {
    writeSaved(SESSION_KEY, next.email)
    setAccount(next)
    setSaved(readList(savedKey(next.email)))
    markWelcomed()
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

  const toggleSaved = (id: string) => {
    if (!account) return
    const next = saved.includes(id) ? saved.filter((s) => s !== id) : [...saved, id]
    setSaved(next)
    writeSaved(savedKey(account.email), JSON.stringify(next))
  }

  return (
    <AuthContext.Provider
      value={{ account, signIn, register, signOut, saved, toggleSaved, welcomed, markWelcomed }}
    >
      {children}
    </AuthContext.Provider>
  )
}
