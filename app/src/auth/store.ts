import type { Account } from './types.ts'

// Where accounts live. Two stores with one shape, so pages never care which one runs:
// - localStore: test logins plus accounts kept on this phone (dev builds and tests).
// - apiStore: the backend's accounts (docs/API.md §4 to §6), when the build talks to the API.

export interface NewAccount {
  name: string
  email: string
  password: string
}

// 'offline': no connection or the server didn't answer in time, so pages don't blame the password.
export type SignInResult =
  | { ok: true; account: Account }
  | { ok: false; reason: 'wrong' | 'suspended' | 'offline' | 'busy' }

export type RegisterResult =
  | { ok: true; account: Account }
  | { ok: false; reason: 'taken' | 'unavailable' | 'offline' | 'invalid' }

export type ChangePasswordResult = 'ok' | 'wrong' | 'offline'

// The photo's new address (a Cloudinary URL online, the data URL on the phone), null once removed.
// 'invalid': wrong type or too big. 'busy': 30 photos a day used. 'unavailable': storage not set up.
export type SetPhotoResult = { ok: true; photo: string | null } | { ok: false; reason: 'offline' | 'invalid' | 'busy' | 'unavailable' }

// What PATCH /me keeps. The photo has its own call (setPhoto, API.md §5.3 and §5.4).
export interface ServerProfile {
  name: string
  phone?: string
  homeArea: string | null
}

export interface AccountStore {
  // True when accounts live on the server: copy and messages change, test logins are gone.
  readonly online: boolean
  // The account this phone was signed in to, from storage (works offline).
  restore(): Account | null
  // Asks the server who is signed in. null = signed out (token gone); undefined = couldn't tell.
  refresh(): Promise<Account | null | undefined>
  signIn(email: string, password: string): Promise<SignInResult>
  register(details: NewAccount): Promise<RegisterResult>
  signOut(): Promise<void>
  updateProfile(account: Account, details: ServerProfile): Promise<Account | 'offline' | 'invalid'>
  changePassword(account: Account, current: string, next: string): Promise<ChangePasswordResult>
  // Replaces the photo (a 256px data URL from auth/photo.ts), or removes it with null.
  setPhoto(account: Account, photo: string | null): Promise<SetPhotoResult>
  // False when this account can't be deleted here (test logins), or the server said no.
  deleteAccount(account: Account): Promise<boolean>
  // Whether this account can change its password and be deleted.
  canManage(account: Account): boolean
  loadSaved(account: Account): Promise<string[]>
  // Saves or unsaves one record. False when the server didn't take it, so the heart flips back.
  setSaved(account: Account, id: string, on: boolean, all: string[]): Promise<boolean>
  // 'preview': this build sends no email (phone-only accounts).
  forgotPassword(email: string): Promise<'sent' | 'offline' | 'preview'>
  resetPassword(email: string, token: string, password: string): Promise<'ok' | 'invalid' | 'offline' | 'preview'>
}
