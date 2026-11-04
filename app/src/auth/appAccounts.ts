import { API_URL } from '../data/api.ts'
import { createApiStore } from './apiStore.ts'
import { localStore } from './localStore.ts'
import type { AccountStore } from './store.ts'

// Picked at build time: the API's accounts when the build talks to the backend, else phone-only
// accounts and the test logins (dev and tests). Vite drops the unused one from the bundle.
// Written with import.meta.env directly so Vite folds it to a constant and the build that talks to
// the API never ships localStore or the test passwords (checked in CI by grepping dist/).
export const appAccounts: AccountStore =
  import.meta.env.VITE_DATA_SOURCE === 'api' && import.meta.env.VITE_API_URL
    ? createApiStore(API_URL ?? '')
    : localStore
