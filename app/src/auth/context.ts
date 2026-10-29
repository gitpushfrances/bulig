import { createContext, useContext } from 'react'
import type { Account } from './types.ts'

export interface Auth {
  account: Account | null
  signIn: (email: string, password: string) => boolean
  signOut: () => void
  // Saved record IDs (services and emergency contacts) for the signed-in account.
  saved: string[]
  toggleSaved: (id: string) => void
}

export const AuthContext = createContext<Auth | null>(null)

export function useAuth(): Auth {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
