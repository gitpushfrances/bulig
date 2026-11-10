import { describe, expect, it } from 'vitest'
import { createApiStore } from './apiStore.ts'
import { inAppBrowser } from './google.ts'

const BASE = 'https://api.test/api/v1'
const user = { id: 'usr_1', email: 'ana@gmail.com', name: 'Ana Reyes', role: 'user', areas: [], createdAt: '2026-11-10' }

function server(...replies: ({ status?: number; body?: unknown } | Error)[]) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchFn = async (url: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init })
    const next = replies.shift() ?? { status: 204 }
    if (next instanceof Error) throw next
    const status = next.status ?? 200
    return new Response(status === 204 ? null : JSON.stringify(next.body ?? {}), { status })
  }
  return { fetchFn, calls }
}
const body = (init: RequestInit) => JSON.parse(String(init.body)) as Record<string, unknown>

describe('Continue with Google (API.md §4.7)', () => {
  it('posts the ID token with the terms, keeps the session and says when the account is new', async () => {
    const { fetchFn, calls } = server({
      status: 201,
      body: { token: '1|g', user: { ...user, hasPassword: false, google: true }, created: true },
    })
    const store = createApiStore(BASE, fetchFn)

    const result = await store.signInWithGoogle('eyJ.id.token')

    expect(calls[0].url).toBe(`${BASE}/auth/google`)
    expect(body(calls[0].init)).toEqual({ idToken: 'eyJ.id.token', acceptedTerms: true, device: 'Bulig PWA' })
    expect(result).toEqual({
      ok: true,
      created: true,
      account: expect.objectContaining({ email: 'ana@gmail.com', hasPassword: false, google: true }),
    })
    expect(localStorage.getItem('bulig.token')).toBe('1|g')
    expect(store.restore()?.hasPassword).toBe(false)
  })

  it('tells a bad token, a suspended account, no signal and a server without Google apart', async () => {
    const { fetchFn } = server(
      { status: 422, body: { message: 'Invalid ID token.' } },
      { status: 403, body: { message: 'This account is suspended.', reason: 'suspended' } },
      new TypeError('Failed to fetch'),
      { status: 404, body: { message: 'Not Found' } },
      { status: 429, body: {} },
    )
    const store = createApiStore(BASE, fetchFn)
    const reasons = []
    for (let i = 0; i < 5; i++) {
      const r = await store.signInWithGoogle('t')
      reasons.push(r.ok ? 'ok' : r.reason)
    }
    expect(reasons).toEqual(['invalid', 'suspended', 'offline', 'unavailable', 'busy'])
    expect(localStorage.getItem('bulig.token')).toBeNull()
  })

  it('reads an older server with no hasPassword as an account with a password', async () => {
    const { fetchFn } = server({ body: { token: '1|a', user } })
    const result = await createApiStore(BASE, fetchFn).signIn('ana@gmail.com', 'long enough')
    expect(result.ok && result.account.hasPassword).toBe(true)
  })

  it('sets a first password without a current one, then remembers the account has one', async () => {
    const { fetchFn, calls } = server({ body: { token: '1|g', user: { ...user, hasPassword: false, google: true } } }, { status: 204 })
    const store = createApiStore(BASE, fetchFn)
    const signed = await store.signInWithGoogle('t')
    if (!signed.ok) throw new Error('not signed in')

    expect(await store.changePassword(signed.account, '', 'a new long one')).toBe('ok')

    expect(body(calls[1].init)).toEqual({ newPassword: 'a new long one' })
    expect(store.restore()?.hasPassword).toBe(true)
  })
})

describe('in-app browsers, where Google blocks sign-in', () => {
  it.each([
    ['Mozilla/5.0 (Linux; Android 13; SM-A145F; wv) AppleWebKit/537.36 [FB_IAB/FB4A;FBAV/450.0.0.0;]', 'Facebook'],
    ['Mozilla/5.0 (Linux; Android 12) [FB_IAB/Orca-Android;FBAV/440.0.0.0;] Messenger', 'Messenger'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Instagram 300.0', 'Instagram'],
    ['Mozilla/5.0 (Linux; Android 12; wv) musical_ly_2023', 'TikTok'],
    ['Mozilla/5.0 (Linux; Android 11; Redmi 9; wv) AppleWebKit/537.36 Version/4.0 Chrome/120 Mobile', 'this app'],
  ])('spots %s', (ua, name) => {
    expect(inAppBrowser(ua)).toBe(name)
  })

  it('leaves Chrome, Samsung Internet and Safari alone', () => {
    expect(inAppBrowser('Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36')).toBeNull()
    expect(inAppBrowser('Mozilla/5.0 (Linux; Android 13) SamsungBrowser/23.0 Chrome/115 Mobile Safari/537.36')).toBeNull()
    expect(inAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1')).toBeNull()
  })
})
