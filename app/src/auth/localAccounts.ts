import { readSaved, writeSaved } from '../data/storage.ts'
import { accountFor as testAccountFor, normalizeEmail } from './testAccount.ts'
import type { Account } from './types.ts'

// Accounts made with "Create account", kept on this phone only until the backend arrives
// (docs/WORKFLOW.md, "Sign-in"). The password is never stored: only a salted SHA-256 hash.
// This is not real security (anyone with the phone can read localStorage); it only keeps a
// reused password from sitting there in plain text.
const ACCOUNTS_KEY = 'bulig.accounts'

interface StoredAccount {
  email: string
  name: string
  salt: string
  hash: string
}

export interface NewAccount {
  name: string
  email: string
  password: string
}

export type RegisterResult = { ok: true; account: Account } | { ok: false; reason: 'taken' | 'unavailable' }

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

function toAccount(stored: StoredAccount): Account {
  // Everyone who signs up is a user. Moderators and admins are appointed, never self-made.
  return { email: stored.email, name: stored.name, role: 'user', areas: [] }
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  return toHex(await crypto.subtle.digest('SHA-256', data))
}

// crypto.subtle only exists on HTTPS (or localhost). Without it, sign-up is switched off.
export function canRegister(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle
}

export function localAccountFor(email: string | null): Account | null {
  const stored = email ? readAll().find((a) => a.email === email) : undefined
  return stored ? toAccount(stored) : null
}

export async function register({ name, email, password }: NewAccount): Promise<RegisterResult> {
  if (!canRegister()) return { ok: false, reason: 'unavailable' }
  const key = normalizeEmail(email)
  const all = readAll()
  if (testAccountFor(key) || all.some((a) => a.email === key)) return { ok: false, reason: 'taken' }

  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
  const stored: StoredAccount = { email: key, name: name.trim(), salt, hash: await hashPassword(password, salt) }
  writeSaved(ACCOUNTS_KEY, JSON.stringify([...all, stored]))
  return { ok: true, account: toAccount(stored) }
}

export async function checkLocalLogin(email: string, password: string): Promise<Account | null> {
  if (!canRegister()) return null
  const stored = readAll().find((a) => a.email === normalizeEmail(email))
  if (!stored) return null
  return (await hashPassword(password, stored.salt)) === stored.hash ? toAccount(stored) : null
}
