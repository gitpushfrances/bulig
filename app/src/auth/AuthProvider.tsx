import { useState, type ReactNode } from 'react'
import { readSaved, writeSaved } from '../data/storage.ts'
import { AuthContext } from './context.ts'
import { accountFor, checkLogin } from './testAccount.ts'

const SESSION_KEY = 'bulig.session'
const savedKey = (email: string) => `bulig.saved.${email}`

function readList(key: string): string[] {
  try {
    const value: unknown = JSON.parse(readSaved(key) ?? '[]')
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

// Keeps the signed-in account and its saved places on this phone only (localStorage).
// Phase 4 swaps checkLogin() for the API; pages keep using useAuth() unchanged.
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState(() => accountFor(readSaved(SESSION_KEY)))
  const [saved, setSaved] = useState(() => (account ? readList(savedKey(account.email)) : []))

  const signIn = (email: string, password: string) => {
    const next = checkLogin(email, password)
    if (!next) return false
    writeSaved(SESSION_KEY, next.email)
    setAccount(next)
    setSaved(readList(savedKey(next.email)))
    return true
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
    <AuthContext.Provider value={{ account, signIn, signOut, saved, toggleSaved }}>
      {children}
    </AuthContext.Provider>
  )
}
