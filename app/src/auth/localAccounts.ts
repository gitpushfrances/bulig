import { readSaved, writeSaved } from '../data/storage.ts'
import { accountFor as testAccountFor, isTestUsername, normalizeEmail } from './testAccount.ts'
import { isReservedUsername, normalizeUsername, usernameError } from './username.ts'
import type { NewAccount, RegisterResult } from './store.ts'
import type { Account } from './types.ts'

// Accounts made with "Create account", kept on this phone only until the backend arrives
// (docs/WORKFLOW.md, "Sign-in"). The password is never stored: only a salted SHA-256 hash.
// This is not real security (anyone with the phone can read localStorage); it only keeps a
// reused password from sitting there in plain text.
const ACCOUNTS_KEY = 'bulig.accounts'

interface StoredAccount {
  email: string
  // Missing on accounts made on this phone before usernames.
  username?: string
  name: string
  salt: string
  hash: string
  createdAt?: string
}


function readAll(): StoredAccount[] {
  try {
    const value: unknown = JSON.parse(readSaved(ACCOUNTS_KEY) ?? '[]')
    return Array.isArray(value)
      ? value.filter(
          (v): v is StoredAccount =>
            !!v && typeof v.email === 'string' && typeof v.name === 'string' && typeof v.salt === 'string' && typeof v.hash === 'string',
        )
      : []
  } catch {
    return []
  }
}

function writeAll(all: StoredAccount[]) {
  writeSaved(ACCOUNTS_KEY, JSON.stringify(all))
}

function toAccount(stored: StoredAccount): Account {
  // Everyone who signs up is a user. Moderators and admins are appointed, never self-made.
  return { email: stored.email, username: stored.username, name: stored.name, role: 'user', areas: [], createdAt: stored.createdAt }
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  return toHex(await crypto.subtle.digest('SHA-256', data))
}

async function withPassword(password: string): Promise<Pick<StoredAccount, 'salt' | 'hash'>> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
  return { salt, hash: await hashPassword(password, salt) }
}

import { canRegister } from './canRegister.ts'

export { canRegister }

export function isLocalAccount(email: string): boolean {
  return readAll().some((a) => a.email === email)
}

export function localAccountFor(email: string | null): Account | null {
  const stored = email ? readAll().find((a) => a.email === email) : undefined
  return stored ? toAccount(stored) : null
}

// Taken by a test login or another account on this phone (not counting `except`, the owner).
function usernameTaken(all: StoredAccount[], username: string, except?: string) {
  return isTestUsername(username) || all.some((a) => a.username === username && a.email !== except)
}

// Same answers as the server (API.md §4.1), so pages handle one set of reasons.
function checkUsername(all: StoredAccount[], username: string, except?: string) {
  if (isReservedUsername(username)) return 'usernameReserved' as const
  if (usernameError(username)) return 'invalid' as const
  return usernameTaken(all, username, except) ? ('usernameTaken' as const) : null
}

export async function register({ name, username, email, password }: NewAccount): Promise<RegisterResult> {
  if (!canRegister()) return { ok: false, reason: 'unavailable' }
  const key = normalizeEmail(email)
  const handle = normalizeUsername(username)
  const all = readAll()
  if (testAccountFor(key) || all.some((a) => a.email === key)) return { ok: false, reason: 'taken' }
  const bad = checkUsername(all, handle)
  if (bad) return { ok: false, reason: bad }

  const stored: StoredAccount = {
    email: key,
    username: handle,
    name: name.trim(),
    createdAt: new Date().toISOString().slice(0, 10),
    ...(await withPassword(password)),
  }
  writeAll([...all, stored])
  return { ok: true, account: toAccount(stored) }
}

// `login` is the email or the username: with "@" it is an email (API.md §4.2).
export async function checkLocalLogin(login: string, password: string): Promise<Account | null> {
  if (!canRegister()) return null
  const key = normalizeEmail(login)
  const stored = readAll().find((a) => (key.includes('@') ? a.email === key : !!a.username && a.username === key))
  if (!stored) return null
  return (await hashPassword(password, stored.salt)) === stored.hash ? toAccount(stored) : null
}

export async function changeLocalPassword(email: string, current: string, next: string): Promise<boolean> {
  const all = readAll()
  const stored = all.find((a) => a.email === email)
  if (!stored || !canRegister() || (await hashPassword(current, stored.salt)) !== stored.hash) return false
  Object.assign(stored, await withPassword(next))
  writeAll(all)
  return true
}

// Name and, when sent, username. Returns why the username can't be used, or null when saved.
export function renameLocalAccount(email: string, name: string, username?: string) {
  const all = readAll()
  const stored = all.find((a) => a.email === email)
  if (!stored) return null
  if (username !== undefined) {
    const handle = normalizeUsername(username)
    const bad = checkUsername(all, handle, email)
    if (bad) return bad
    stored.username = handle
  }
  stored.name = name
  writeAll(all)
  return null
}

export function deleteLocalAccount(email: string) {
  writeAll(readAll().filter((a) => a.email !== email))
}
