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

// API.md §4.7. created: a new account was made (land on Home with "Finish your profile").
// 'invalid': Google's answer didn't check out (expired, another app's, email not verified).
// 'unavailable': this server has no Google sign-in yet.
export type GoogleSignInResult =
  | { ok: true; account: Account; created: boolean }
  | { ok: false; reason: 'invalid' | 'suspended' | 'offline' | 'busy' | 'unavailable' }

// API.md §5.7. 'same': already this account's email. 'wrong': not the current password.
// 'busy': 5 asks an hour used. 'unavailable': any other answer (e.g. a server without this yet). 'preview': this build sends no email (phone-only accounts).
export type EmailChangeResult =
  | { ok: true; account: Account }
  | { ok: false; reason: 'same' | 'taken' | 'wrong' | 'invalid' | 'busy' | 'offline' | 'preview' | 'unavailable' }

// API.md §4.6, the link. 'invalid': unknown, used, cancelled or expired. 'taken': someone took the address meanwhile.
export type ConfirmEmailResult = { ok: true; email: string } | { ok: false; reason: 'invalid' | 'taken' | 'offline' | 'preview' }

// The photo's new address (a Cloudinary URL online, the data URL on the phone), null once removed.
// 'invalid': wrong type or too big. 'busy': 30 photos a day used. 'unavailable': storage not set up.
export type SetPhotoResult = { ok: true; photo: string | null } | { ok: false; reason: 'offline' | 'invalid' | 'busy' | 'unavailable' }

// What PATCH /me keeps. The photo has its own call (setPhoto, API.md §5.3 and §5.4).
export interface ServerProfile {
  name: string
  phone?: string
  homeArea: string | null
}

// ok: the server has it. retry: it didn't get there (offline, server asleep or busy): the heart stays
// and the app sends it again. rejected: the server said no (the place is gone, signed out): it flips back.
export type SaveResult = 'ok' | 'retry' | 'rejected'

export interface AccountStore {
  // True when accounts live on the server: copy and messages change, test logins are gone.
  readonly online: boolean
  // The account this phone was signed in to, from storage (works offline).
  restore(): Account | null
  // Asks the server who is signed in. null = signed out (token gone); undefined = couldn't tell.
  refresh(): Promise<Account | null | undefined>
  signIn(email: string, password: string): Promise<SignInResult>
  // The ID token Google's button hands the page (a JWT). The server checks it and signs in, links or creates.
  signInWithGoogle(idToken: string): Promise<GoogleSignInResult>
  register(details: NewAccount): Promise<RegisterResult>
  signOut(): Promise<void>
  updateProfile(account: Account, details: ServerProfile): Promise<Account | 'offline' | 'invalid'>
  // `current` is empty when the account has no password yet (made with Google): that sets one.
  changePassword(account: Account, current: string, next: string): Promise<ChangePasswordResult>
  // Replaces the photo (a 256px data URL from auth/photo.ts), or removes it with null.
  setPhoto(account: Account, photo: string | null): Promise<SetPhotoResult>
  // Sends a link to the new address; nothing changes until it is opened. The account comes back with pendingEmail.
  requestEmailChange(account: Account, newEmail: string, password: string): Promise<EmailChangeResult>
  // The link stops working. Returns the account without pendingEmail, or null if the server didn't answer.
  cancelEmailChange(account: Account): Promise<Account | null>
  // The link from the email; works signed out too.
  confirmEmail(token: string): Promise<ConfirmEmailResult>
  // False when this account can't be deleted here (test logins), or the server said no.
  deleteAccount(account: Account): Promise<boolean>
  // Whether this account can change its password and be deleted.
  canManage(account: Account): boolean
  // The saved record IDs, or null when they couldn't be loaded (offline, server asleep or down), so
  // the app keeps what it has instead of showing an empty list.
  loadSaved(account: Account): Promise<string[] | null>
  // Saves or unsaves one record. False when the server didn't take it, so the heart flips back.
  setSaved(account: Account, id: string, on: boolean, all: string[]): Promise<SaveResult>
  // 'preview': this build sends no email (phone-only accounts).
  forgotPassword(email: string): Promise<'sent' | 'offline' | 'preview'>
  resetPassword(email: string, token: string, password: string): Promise<'ok' | 'invalid' | 'offline' | 'preview'>
}
