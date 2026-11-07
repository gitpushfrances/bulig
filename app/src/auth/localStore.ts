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

const SESSION_KEY = 'bulig.session'
const savedKey = (email: string) => `bulig.saved.${email}`

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
    return accountFor(email) ?? localAccountFor(email)
  },

  async refresh() {
    return this.restore()
  },

  async signIn(login, password) {
    const account = checkLogin(login, password) ?? (await checkLocalLogin(login, password))
    if (!account) return { ok: false, reason: 'wrong' }
    writeSaved(SESSION_KEY, account.email)
    return { ok: true, account }
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
    if (isLocalAccount(account.email)) {
      const bad = renameLocalAccount(account.email, details.name, details.username)
      if (bad) return bad
    } else if (details.username !== undefined) {
      return 'invalid' // test logins keep their username
    }
    const { username, ...rest } = details
    return { ...account, ...rest, ...(username !== undefined ? { username: username.trim().toLowerCase() } : {}) }
  },

  // Phone-only accounts keep the photo with their other details (AuthProvider, bulig.profile.*).
  async setPhoto(_account, photo) {
    return { ok: true, photo }
  },

  async changePassword(account, current, next) {
    return (await changeLocalPassword(account.email, current, next)) ? 'ok' : 'wrong'
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
