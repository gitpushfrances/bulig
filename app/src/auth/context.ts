import { createContext, useContext } from 'react'
import type { NewAccount, RegisterResult } from './localAccounts.ts'
import type { Account, ProfileDetails } from './types.ts'

export interface Auth {
  account: Account | null
  // Browsing without an account: Emergency only (911 and local authorities).
  guest: boolean
  continueAsGuest: () => void
  signIn: (email: string, password: string) => Promise<boolean>
  register: (details: NewAccount) => Promise<RegisterResult>
  signOut: () => void
  updateProfile: (details: ProfileDetails) => void
  // Local accounts only; test logins keep their password.
  changePassword: (current: string, next: string) => Promise<boolean>
  // Local accounts only: removes the account, its saved places and details from this phone.
  deleteAccount: () => void
  // True for accounts made on this phone; false for the built-in test logins.
  isLocal: boolean
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
