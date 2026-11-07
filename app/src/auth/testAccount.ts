import type { Account, Role } from './types.ts'

// TEST LOGINS ONLY, until real sign-in arrives with the backend (docs/WORKFLOW.md, "Sign-in").
// They ship inside the app's JavaScript, so they protect nothing: anyone can read them. They only
// let testers try each role. Never put a real password here.
export const TEST_PASSWORD = 'password'

export const TEST_ACCOUNTS: Record<Role, Account> = {
  user: { email: 'test@bulig.com', username: 'test', name: 'Test traveller', role: 'user', areas: [], createdAt: '2026-10-01' },
  contributor: {
    email: 'contributor@bulig.com',
    username: 'test_contributor',
    name: 'Test contributor',
    role: 'contributor',
    areas: [],
    createdAt: '2026-10-01',
  },
  // No areas = the whole country, like the real moderators for now (WORKFLOW.md).
  moderator: { email: 'moderator@bulig.com', username: 'test_moderator', name: 'Test moderator', role: 'moderator', areas: [], createdAt: '2026-10-01' },
  admin: { email: 'admin@bulig.com', username: 'test_admin', name: 'Test admin', role: 'admin', areas: [], createdAt: '2026-10-01' },
}

export const TEST_LOGIN = { email: 'test@bulig.com', password: TEST_PASSWORD }

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function accountFor(email: string | null): Account | null {
  return Object.values(TEST_ACCOUNTS).find((a) => a.email === email) ?? null
}

// A test login's username, so sign-up can't take one (they live only in this file).
export const isTestUsername = (username: string) => Object.values(TEST_ACCOUNTS).some((a) => a.username === username)

// `login` is the email or the username (API.md §4.2): with "@" it is an email.
export function checkLogin(login: string, password: string): Account | null {
  const key = normalizeEmail(login)
  const account = key.includes('@') ? accountFor(key) : (Object.values(TEST_ACCOUNTS).find((a) => a.username === key) ?? null)
  return account && password === TEST_PASSWORD ? account : null
}
