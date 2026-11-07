import { ApiError, OfflineError, apiRequest } from '../data/api.ts'
import { readSaved, writeSaved } from '../data/storage.ts'
import type { AccountStore, ServerProfile } from './store.ts'
import { ROLES, type Account, type Role } from './types.ts'
import { normalizeUsername } from './username.ts'

// Accounts on the backend (docs/API.md §4 to §6): Sanctum bearer tokens, no cookies.
// The token and a copy of the account stay on the phone, so the app opens signed in with no signal.

const TOKEN_KEY = 'bulig.token'
const ACCOUNT_KEY = 'bulig.account'
// Hearts saved before accounts moved online. Sent once on the first sign-in, then cleared (§6).
const oldSavedKey = (email: string) => `bulig.saved.${email}`
const DEVICE = 'Bulig PWA'

// API.md §8.1. Unknown roles count as "user", so a new server role never unlocks anything here.
interface ApiUser {
  id: string
  username?: string | null
  email: string
  name: string
  role: string
  areas?: string[]
  createdAt?: string | null
  phone?: string | null
  homeArea?: string | null
  photoUrl?: string | null
  pendingEmail?: string | null
}

// "data:image/webp;base64,..." → a Blob to upload as multipart (no fetch(), so it works everywhere).
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, data] = dataUrl.split(',', 2)
  const type = /data:([^;]+)/.exec(head)?.[1] ?? 'image/webp'
  const bytes = atob(data)
  const out = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) out[i] = bytes.charCodeAt(i)
  return new Blob([out], { type })
}

// API.md §4.1: errors.username is ["taken"] or ["reserved"]; anything else is a plain bad value.
function usernameReason(why: string | undefined): 'usernameTaken' | 'usernameReserved' | undefined {
  return why === 'taken' ? 'usernameTaken' : why === 'reserved' ? 'usernameReserved' : undefined
}

export function toAccount(user: ApiUser): Account {
  const role: Role = (ROLES as readonly string[]).includes(user.role) ? (user.role as Role) : 'user'
  return {
    email: user.email,
    username: user.username ?? undefined,
    name: user.name,
    role,
    areas: user.areas ?? [],
    createdAt: user.createdAt ?? undefined,
    phone: user.phone ?? undefined,
    homeArea: user.homeArea ?? null,
    photo: user.photoUrl ?? undefined,
    pendingEmail: user.pendingEmail ?? undefined,
  }
}

// "0917 123 4567" or "+63 917 123 4567" → "+639171234567" (API.md §5.2).
export function toE164(phone: string): string {
  const digits = phone.replace(/[\s-]/g, '')
  if (digits.startsWith('+63')) return digits
  if (digits.startsWith('63')) return `+${digits}`
  if (digits.startsWith('0')) return `+63${digits.slice(1)}`
  return digits
}

function readAccount(): Account | null {
  try {
    const value = JSON.parse(readSaved(ACCOUNT_KEY) ?? 'null') as Account | null
    return value && typeof value.email === 'string' ? value : null
  } catch {
    return null
  }
}

function keep(token: string | null, account: Account | null) {
  writeSaved(TOKEN_KEY, token)
  writeSaved(ACCOUNT_KEY, account ? JSON.stringify(account) : null)
}

export function createApiStore(base: string, fetchFn: typeof fetch = (...args) => fetch(...args)): AccountStore {
  const call = <T>(path: string, init: Parameters<typeof apiRequest>[2] = {}) =>
    apiRequest<T>(base, path, { token: readSaved(TOKEN_KEY), ...init }, fetchFn)

  // A 401 on any signed-in request means the token is gone (signed out elsewhere, suspended).
  const signedOut = (err: unknown) => err instanceof ApiError && err.status === 401

  async function sendOldHearts(account: Account) {
    let old: unknown
    try {
      old = JSON.parse(readSaved(oldSavedKey(account.email)) ?? '[]')
    } catch {
      old = []
    }
    if (!Array.isArray(old) || old.length === 0) return
    for (const id of old) {
      if (typeof id !== 'string') continue
      // A record that no longer exists answers 404; skip it, keep going.
      await call(`/me/saved/${encodeURIComponent(id)}`, { method: 'PUT' }).catch(() => undefined)
    }
    writeSaved(oldSavedKey(account.email), null)
  }

  async function startSession(promise: Promise<{ token: string; user: ApiUser }>) {
    const { token, user } = await promise
    const account = toAccount(user)
    keep(token, account)
    return account
  }

  return {
    online: true,

    restore() {
      return readSaved(TOKEN_KEY) ? readAccount() : null
    },

    async refresh() {
      if (!readSaved(TOKEN_KEY)) return null
      try {
        const account = toAccount(await call<ApiUser>('/me'))
        keep(readSaved(TOKEN_KEY), account)
        return account
      } catch (err) {
        if (signedOut(err)) {
          keep(null, null)
          return null
        }
        return undefined
      }
    },

    async signIn(login, password) {
      try {
        const account = await startSession(
          call('/auth/login', { method: 'POST', body: { login: login.trim(), password, device: DEVICE }, token: null }),
        )
        await sendOldHearts(account)
        return { ok: true, account }
      } catch (err) {
        if (err instanceof OfflineError) return { ok: false, reason: 'offline' }
        if (err instanceof ApiError && err.status === 403 && err.body.reason === 'suspended')
          return { ok: false, reason: 'suspended' }
        if (err instanceof ApiError && err.status === 429) return { ok: false, reason: 'busy' }
        if (err instanceof ApiError && err.status === 422) return { ok: false, reason: 'wrong' }
        throw err
      }
    },

    async register({ name, username, email, password }) {
      try {
        const account = await startSession(
          call('/auth/register', {
            method: 'POST',
            body: { name: name.trim(), username: normalizeUsername(username), email: email.trim(), password, acceptedTerms: true, device: DEVICE },
            token: null,
          }),
        )
        return { ok: true, account }
      } catch (err) {
        if (err instanceof OfflineError) return { ok: false, reason: 'offline' }
        if (err instanceof ApiError && err.status === 422) {
          const errors = err.fieldErrors()
          if (errors.email) return { ok: false, reason: 'taken' }
          const why = usernameReason(errors.username?.[0])
          return { ok: false, reason: why ?? 'invalid' }
        }
        if (err instanceof ApiError && err.status === 429) return { ok: false, reason: 'offline' }
        throw err
      }
    },

    async signOut() {
      // Sign out on the phone even with no signal; the token is revoked when the server answers.
      const token = readSaved(TOKEN_KEY)
      keep(null, null)
      if (token) await call('/auth/logout', { method: 'POST', token, timeoutMs: 10_000 }).catch(() => undefined)
    },

    async updateProfile(_account, { name, username, phone, homeArea }: ServerProfile) {
      try {
        const account = toAccount(
          await call<ApiUser>('/me', {
            method: 'PATCH',
            body: {
              name: name.trim(),
              ...(username ? { username: normalizeUsername(username) } : {}),
              phone: phone ? toE164(phone) : null,
              homeArea,
            },
          }),
        )
        keep(readSaved(TOKEN_KEY), account)
        return account
      } catch (err) {
        if (err instanceof OfflineError) return 'offline'
        if (err instanceof ApiError && err.status === 422) return usernameReason(err.fieldErrors().username?.[0]) ?? 'invalid'
        throw err
      }
    },

    async setPhoto(account, photo) {
      try {
        let url: string | null = null
        if (photo) {
          const form = new FormData()
          const blob = dataUrlToBlob(photo)
          form.append('photo', blob, blob.type === 'image/jpeg' ? 'avatar.jpg' : 'avatar.webp')
          url = (await call<{ photoUrl: string }>('/me/photo', { method: 'POST', body: form })).photoUrl
        } else {
          await call('/me/photo', { method: 'DELETE' })
        }
        keep(readSaved(TOKEN_KEY), { ...account, photo: url ?? undefined })
        return { ok: true as const, photo: url }
      } catch (err) {
        if (err instanceof OfflineError) return { ok: false as const, reason: 'offline' as const }
        if (err instanceof ApiError && err.status === 422) return { ok: false as const, reason: 'invalid' as const }
        if (err instanceof ApiError && err.status === 429) return { ok: false as const, reason: 'busy' as const }
        if (err instanceof ApiError && err.status === 503) return { ok: false as const, reason: 'unavailable' as const }
        throw err
      }
    },

    async changePassword(_account, current, next) {
      try {
        await call('/me/password', { method: 'PUT', body: { currentPassword: current, newPassword: next } })
        return 'ok'
      } catch (err) {
        if (err instanceof OfflineError) return 'offline'
        if (err instanceof ApiError && err.status === 422) return 'wrong'
        throw err
      }
    },

    async requestEmailChange(account, newEmail, password) {
      try {
        const { pendingEmail } = await call<{ pendingEmail: string }>('/me/email', {
          method: 'POST',
          body: { newEmail: newEmail.trim().toLowerCase(), currentPassword: password },
        })
        const next = { ...account, pendingEmail }
        keep(readSaved(TOKEN_KEY), next)
        return { ok: true as const, account: next }
      } catch (err) {
        if (err instanceof OfflineError) return { ok: false as const, reason: 'offline' as const }
        if (err instanceof ApiError && err.status === 429) return { ok: false as const, reason: 'busy' as const }
        if (err instanceof ApiError && err.status === 422) {
          const errors = (err.body.errors ?? {}) as Record<string, string[] | undefined>
          if (errors.currentPassword) return { ok: false as const, reason: 'wrong' as const }
          const why = errors.newEmail?.[0]
          return { ok: false as const, reason: why === 'same' || why === 'taken' ? why : ('invalid' as const) }
        }
        if (signedOut(err)) keep(null, null)
        return { ok: false as const, reason: 'unavailable' as const }
      }
    },

    async cancelEmailChange(account) {
      try {
        await call('/me/email', { method: 'DELETE' })
        const next = { ...account, pendingEmail: undefined }
        keep(readSaved(TOKEN_KEY), next)
        return next
      } catch {
        return null
      }
    },

    async confirmEmail(token) {
      try {
        const { email } = await call<{ email: string }>('/auth/confirm-email', { method: 'POST', body: { token }, token: null })
        return { ok: true as const, email }
      } catch (err) {
        if (err instanceof OfflineError) return { ok: false as const, reason: 'offline' as const }
        const why = err instanceof ApiError ? ((err.body.errors ?? {}) as Record<string, string[] | undefined>).token?.[0] : undefined
        return { ok: false as const, reason: why === 'taken' ? ('taken' as const) : ('invalid' as const) }
      }
    },

    async deleteAccount() {
      try {
        await call('/me', { method: 'DELETE', body: { confirm: 'delete' } })
        keep(null, null)
        return true
      } catch {
        return false
      }
    },

    canManage: () => true,

    async loadSaved() {
      try {
        const { items } = await call<{ items: { recordId: string }[] }>('/me/saved')
        return items.map((i) => i.recordId)
      } catch {
        return null
      }
    },

    async setSaved(_account, id, on) {
      try {
        await call(`/me/saved/${encodeURIComponent(id)}`, { method: on ? 'PUT' : 'DELETE' })
        return 'ok'
      } catch (err) {
        // No answer, or the free server waking up or busy (5xx, 429): try again later.
        if (!(err instanceof ApiError) || err.status >= 500 || err.status === 429) return 'retry'
        // 404 (the place is no longer listed), 401 (signed out), 422: sending it again won't help.
        console.warn(`Bulig: saving ${id} was refused (${err.status}).`)
        return 'rejected'
      }
    },

    async forgotPassword(email) {
      try {
        await call('/auth/forgot-password', { method: 'POST', body: { email: email.trim() }, token: null })
        return 'sent'
      } catch (err) {
        if (err instanceof OfflineError) return 'offline'
        // Any other answer still gets the same "check your inbox", so nobody learns who has an account.
        return 'sent'
      }
    },

    async resetPassword(email, token, password) {
      try {
        await call('/auth/reset-password', { method: 'POST', body: { email, token, password }, token: null })
        return 'ok'
      } catch (err) {
        if (err instanceof OfflineError) return 'offline'
        return 'invalid'
      }
    },
  }
}
