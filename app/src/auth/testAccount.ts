import type { Account } from './types.ts'

// TEST LOGIN ONLY, until real sign-in arrives with the backend (docs/WORKFLOW.md, "Sign-in").
// It ships inside the app's JavaScript, so it protects nothing: anyone can read it. It only
// lets testers try saving places. Never put a real password here.
export const TEST_LOGIN = { email: 'test@bulig.com', password: 'password' }

const TEST_ACCOUNT: Account = {
  email: TEST_LOGIN.email,
  name: 'Test traveller',
  role: 'user',
  areas: [],
}

export function checkLogin(email: string, password: string): Account | null {
  const sameEmail = email.trim().toLowerCase() === TEST_LOGIN.email
  return sameEmail && password === TEST_LOGIN.password ? TEST_ACCOUNT : null
}

export function accountFor(email: string | null): Account | null {
  return email === TEST_ACCOUNT.email ? TEST_ACCOUNT : null
}
