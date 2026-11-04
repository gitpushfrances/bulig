import { createContext, useContext } from 'react'
import type { ChangePasswordResult, ConfirmEmailResult, EmailChangeResult, NewAccount, RegisterResult, SignInResult } from './store.ts'
import type { Account, ProfileDetails } from './types.ts'

export type UpdateProfileResult = 'ok' | 'offline' | 'invalid' | { photo: 'offline' | 'invalid' | 'busy' | 'unavailable' }

export interface Auth {
  account: Account | null
  // Browsing without an account: Emergency only (911 and local authorities).
  guest: boolean
  continueAsGuest: () => void
  signIn: (email: string, password: string) => Promise<SignInResult>
  register: (details: NewAccount) => Promise<RegisterResult>
  signOut: () => void
  // 'ok', or why it didn't save: no connection, or the server refused a field. `photo`: the details
  // saved but the photo didn't (and why), so the page can say exactly that.
  updateProfile: (details: ProfileDetails) => Promise<UpdateProfileResult>
  // Test logins keep their password.
  changePassword: (current: string, next: string) => Promise<ChangePasswordResult>
  // API.md §5.7: sends a link to the new address; the account shows pendingEmail until it is opened.
  requestEmailChange: (newEmail: string, password: string) => Promise<EmailChangeResult>
  // False if the server didn't answer (the link still works then).
  cancelEmailChange: () => Promise<boolean>
  // The link (API.md §4.6). If this phone is signed in, its account picks up the new email.
  confirmEmail: (token: string) => Promise<ConfirmEmailResult>
  // Removes the account and its saved places (on the server, or from this phone). False if it couldn't.
  deleteAccount: () => Promise<boolean>
  // False for the built-in test logins, which can't change their password or be deleted.
  canManage: boolean
  // True when accounts live on the server (the build talks to the API), false for phone-only accounts.
  accountsOnline: boolean
  // Sends a reset link. 'preview' = this build sends no email.
  forgotPassword: (email: string) => Promise<'sent' | 'offline' | 'preview'>
  resetPassword: (email: string, token: string, password: string) => Promise<'ok' | 'invalid' | 'offline' | 'preview'>
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
