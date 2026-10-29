import type { Account, Role } from './types.ts'

// TEST LOGINS ONLY, until real sign-in arrives with the backend (docs/WORKFLOW.md, "Sign-in").
// They ship inside the app's JavaScript, so they protect nothing: anyone can read them. They only
// let testers try each role. Never put a real password here.
export const TEST_PASSWORD = 'password'

export const TEST_ACCOUNTS: Record<Role, Account> = {
  user: { email: 'test@bulig.com', name: 'Test traveller', role: 'user', areas: [], createdAt: '2026-10-01' },
  moderator: {
    email: 'moderator@bulig.com',
    name: 'Test moderator',
    role: 'moderator',
    areas: ['ph-cebu-cebu-city'],
    createdAt: '2026-10-01',
  },
  admin: { email: 'admin@bulig.com', name: 'Test admin', role: 'admin', areas: [], createdAt: '2026-10-01' },
}

export const TEST_LOGIN = { email: TEST_ACCOUNTS.user.email, password: TEST_PASSWORD }

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function accountFor(email: string | null): Account | null {
  return Object.values(TEST_ACCOUNTS).find((a) => a.email === email) ?? null
}

export function checkLogin(email: string, password: string): Account | null {
  const account = accountFor(normalizeEmail(email))
  return account && password === TEST_PASSWORD ? account : null
}
