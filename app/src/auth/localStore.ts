import { readSaved, writeSaved } from '../data/storage.ts'
import {
  changeLocalPassword,
  checkLocalLogin,
  deleteLocalAccount,
  isLocalAccount,
  localAccountFor,
  register as registerLocal,
  renameLocalAccount,
} from './localAccounts.ts'
import type { AccountStore } from './store.ts'
import { accountFor, checkLogin } from './testAccount.ts'
import type { Account, ContributorRequest } from './types.ts'

const SESSION_KEY = 'bulig.session'
const savedKey = (email: string) => `bulig.saved.${email}`
// "Become a contributor" on a phone-only account: kept here so the page shows "waiting". Nobody
// reviews it (there is no server); dev and tests only.
const requestKey = (email: string) => `bulig.contributorRequest.${email}`

function withRequest(account: Account | null): Account | null {
  if (!account) return null
  try {
    const request = JSON.parse(readSaved(requestKey(account.email)) ?? 'null') as ContributorRequest | null
    return request && typeof request.status === 'string' ? { ...account, contributorRequest: request } : account
  } catch {
    return account
  }
}

function readList(key: string): string[] {
  try {
    const value: unknown = JSON.parse(readSaved(key) ?? '[]')
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

// Test logins and accounts made on this phone, all in localStorage. Used by dev builds and tests;
// a build that talks to the API uses apiStore instead and never ships the test passwords.
export const localStore: AccountStore = {
  online: false,

  restore() {
    const email = readSaved(SESSION_KEY)
    return withRequest(accountFor(email) ?? localAccountFor(email))
  },

  async refresh() {
    return this.restore()
  },

  async signIn(email, password) {
    const account = checkLogin(email, password) ?? (await checkLocalLogin(email, password))
    if (!account) return { ok: false, reason: 'wrong' }
    writeSaved(SESSION_KEY, account.email)
    return { ok: true, account: withRequest(account) ?? account }
  },

  // Google needs the server (it checks Google's answer), so phone-only builds don't show the button.
  async signInWithGoogle() {
    return { ok: false, reason: 'unavailable' }
  },

  async register(details) {
    const result = await registerLocal(details)
    if (result.ok) writeSaved(SESSION_KEY, result.account.email)
    return result
  },

  async signOut() {
    writeSaved(SESSION_KEY, null)
  },

  async updateProfile(account, details) {
    if (isLocalAccount(account.email)) renameLocalAccount(account.email, details.name)
    return { ...account, ...details }
  },

  // Phone-only accounts keep the photo with their other details (AuthProvider, bulig.profile.*).
  async setPhoto(_account, photo) {
    return { ok: true, photo }
  },

  async changePassword(account, current, next) {
    return (await changeLocalPassword(account.email, current, next)) ? 'ok' : 'wrong'
  },

  async requestContributor(account, { area, reason }) {
    if (account.role !== 'user') return { ok: false, reason: 'already' }
    const request: ContributorRequest = {
      status: 'pending',
      area: area.trim(),
      reason: reason.trim() || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    writeSaved(requestKey(account.email), JSON.stringify(request))
    return { ok: true, account: { ...account, contributorRequest: request } }
  },

  // Phone-only accounts have no mailbox to confirm, so they keep their email.
  async requestEmailChange() {
    return { ok: false, reason: 'preview' }
  },

  async cancelEmailChange(account) {
    return account
  },

  async confirmEmail() {
    return { ok: false, reason: 'preview' }
  },

  async deleteAccount(account) {
    if (!isLocalAccount(account.email)) return false
    deleteLocalAccount(account.email)
    writeSaved(savedKey(account.email), null)
    writeSaved(requestKey(account.email), null)
    writeSaved(SESSION_KEY, null)
    return true
  },

  canManage: (account) => isLocalAccount(account.email),

  async loadSaved(account) {
    return readList(savedKey(account.email))
  },

  async setSaved(account, _id, _on, all) {
    writeSaved(savedKey(account.email), JSON.stringify(all))
    return 'ok' as const
  },

  async forgotPassword() {
    return 'preview'
  },

  async resetPassword() {
    return 'preview'
  },
}
