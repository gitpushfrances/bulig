import { describe, expect, it, vi } from 'vitest'
import { createApiStore, toE164 } from './apiStore.ts'

const BASE = 'https://api.test/api/v1'
const user = {
  id: 'usr_1',
  email: 'ana@example.com',
  name: 'Ana Reyes',
  role: 'user',
  areas: [],
  createdAt: '2026-11-04',
  phone: null,
  homeArea: null,
  photoUrl: null,
}

type Reply = { status?: number; body?: unknown } | Error
// Answers each request in order and records what was sent.
function server(...replies: Reply[]) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchFn = vi.fn<typeof fetch>(async (url, init = {}) => {
    calls.push({ url: String(url), init })
    const next = replies.shift() ?? { status: 204 }
    if (next instanceof Error) throw next
    const status = next.status ?? 200
    return new Response(status === 204 ? null : JSON.stringify(next.body ?? {}), { status })
  })
  return { fetchFn, calls }
}

const body = (init: RequestInit) => JSON.parse(String(init.body)) as Record<string, unknown>
const header = (init: RequestInit, name: string) => (init.headers as Record<string, string>)[name]

describe('apiStore', () => {
  it('signs in, keeps the token and account, and opens signed in next time', async () => {
    const { fetchFn, calls } = server({ body: { token: '1|abc', user } })
    const store = createApiStore(BASE, fetchFn)

    const result = await store.signIn(' ana@example.com ', 'long enough')

    expect(result).toEqual({ ok: true, account: expect.objectContaining({ email: 'ana@example.com', role: 'user' }) })
    expect(calls[0].url).toBe(`${BASE}/auth/login`)
    expect(body(calls[0].init)).toEqual({ email: 'ana@example.com', password: 'long enough', device: 'Bulig PWA' })
    expect(localStorage.getItem('bulig.token')).toBe('1|abc')
    expect(store.restore()?.name).toBe('Ana Reyes')
  })

  it('tells a wrong password, a suspended account and no connection apart', async () => {
    const { fetchFn } = server(
      { status: 422, body: { message: 'These credentials do not match our records.' } },
      { status: 403, body: { message: 'This account is suspended.', reason: 'suspended' } },
      new TypeError('Failed to fetch'),
    )
    const store = createApiStore(BASE, fetchFn)

    expect(await store.signIn('a@b.co', 'x')).toEqual({ ok: false, reason: 'wrong' })
    expect(await store.signIn('a@b.co', 'x')).toEqual({ ok: false, reason: 'suspended' })
    expect(await store.signIn('a@b.co', 'x')).toEqual({ ok: false, reason: 'offline' })
  })

  it('registers, and says when the email is taken', async () => {
    const { fetchFn, calls } = server(
      { status: 201, body: { token: '2|def', user } },
      { status: 422, body: { message: 'taken', errors: { email: ['taken'] } } },
    )
    const store = createApiStore(BASE, fetchFn)

    expect((await store.register({ name: ' Ana Reyes ', email: 'ana@example.com', password: 'long enough' })).ok).toBe(true)
    expect(body(calls[0].init)).toMatchObject({ name: 'Ana Reyes', acceptedTerms: true })
    expect(await store.register({ name: 'Ana', email: 'ana@example.com', password: 'long enough' })).toEqual({
      ok: false,
      reason: 'taken',
    })
  })

  it('sends the token on signed-in requests and signs the phone out on 401', async () => {
    localStorage.setItem('bulig.token', '1|abc')
    localStorage.setItem('bulig.account', JSON.stringify({ email: 'ana@example.com', name: 'Ana', role: 'user', areas: [] }))
    const { fetchFn, calls } = server({ status: 401, body: { message: 'Unauthenticated.' } })
    const store = createApiStore(BASE, fetchFn)

    expect(await store.refresh()).toBeNull()
    expect(header(calls[0].init, 'Authorization')).toBe('Bearer 1|abc')
    expect(store.restore()).toBeNull()
  })

  it('keeps the account when the server is unreachable on start', async () => {
    localStorage.setItem('bulig.token', '1|abc')
    localStorage.setItem('bulig.account', JSON.stringify({ email: 'ana@example.com', name: 'Ana', role: 'user', areas: [] }))
    const store = createApiStore(BASE, server(new TypeError('Failed to fetch')).fetchFn)

    expect(await store.refresh()).toBeUndefined()
    expect(store.restore()?.email).toBe('ana@example.com')
  })

  it('sends the profile with the phone in +63 form', async () => {
    localStorage.setItem('bulig.token', '1|abc')
    const { fetchFn, calls } = server({ body: { ...user, name: 'Juan', phone: '+639171234567' } })
    const store = createApiStore(BASE, fetchFn)
    const account = store.restore() ?? { email: 'ana@example.com', name: 'Ana', role: 'user' as const, areas: [] }

    const result = await store.updateProfile(account, { name: 'Juan', phone: '0917 123 4567', homeArea: null })

    expect(calls[0].init.method).toBe('PATCH')
    expect(body(calls[0].init)).toEqual({ name: 'Juan', phone: '+639171234567', homeArea: null })
    expect(result).toMatchObject({ name: 'Juan', phone: '+639171234567' })
  })

  it('uploads the photo as multipart, keeps its URL, removes it, and says why it failed', async () => {
    const { fetchFn, calls } = server(
      { body: { photoUrl: 'https://res.cloudinary.com/x/bulig/avatars/a.webp' } },
      { status: 204 },
      { status: 503, body: { message: 'Photo storage is not set up.' } },
      { status: 429, body: {} },
      new TypeError('Failed to fetch'),
    )
    const store = createApiStore(BASE, fetchFn)
    localStorage.setItem('bulig.token', '1|abc')
    const account = { email: 'ana@example.com', name: 'Ana', role: 'user' as const, areas: [] }
    const photo = `data:image/webp;base64,${btoa('RIFF0000WEBP')}`

    expect(await store.setPhoto(account, photo)).toEqual({ ok: true, photo: 'https://res.cloudinary.com/x/bulig/avatars/a.webp' })
    expect(calls[0].url).toBe(`${BASE}/me/photo`)
    expect(calls[0].init.method).toBe('POST')
    const form = calls[0].init.body as FormData
    expect(form).toBeInstanceOf(FormData)
    expect((form.get('photo') as File).type).toBe('image/webp')
    // The browser sets the multipart boundary itself, so no JSON Content-Type is sent.
    expect(header(calls[0].init, 'Content-Type')).toBeUndefined()
    expect(store.restore()?.photo).toBe('https://res.cloudinary.com/x/bulig/avatars/a.webp')

    expect(await store.setPhoto(account, null)).toEqual({ ok: true, photo: null })
    expect(calls[1].init.method).toBe('DELETE')

    expect(await store.setPhoto(account, photo)).toEqual({ ok: false, reason: 'unavailable' })
    expect(await store.setPhoto(account, photo)).toEqual({ ok: false, reason: 'busy' })
    expect(await store.setPhoto(account, photo)).toEqual({ ok: false, reason: 'offline' })
  })

  it('asks for an email change, keeps the pending address, cancels it, and says why it failed', async () => {
    const { fetchFn, calls } = server(
      { status: 202, body: { pendingEmail: 'juan@example.com' } },
      { status: 204 },
      { status: 422, body: { errors: { currentPassword: ['incorrect'] } } },
      { status: 422, body: { errors: { newEmail: ['taken'] } } },
      { status: 422, body: { errors: { newEmail: ['same'] } } },
      { status: 429, body: {} },
      new TypeError('Failed to fetch'),
    )
    const store = createApiStore(BASE, fetchFn)
    localStorage.setItem('bulig.token', '1|abc')
    const account = { email: 'ana@example.com', name: 'Ana', role: 'user' as const, areas: [] }

    const asked = await store.requestEmailChange(account, ' Juan@Example.com ', 'long enough')
    expect(asked).toEqual({ ok: true, account: { ...account, pendingEmail: 'juan@example.com' } })
    expect(calls[0].url).toBe(`${BASE}/me/email`)
    expect(body(calls[0].init)).toEqual({ newEmail: 'juan@example.com', currentPassword: 'long enough' })
    expect(store.restore()?.pendingEmail).toBe('juan@example.com')

    expect(await store.cancelEmailChange({ ...account, pendingEmail: 'juan@example.com' })).toEqual({ ...account, pendingEmail: undefined })
    expect(calls[1].init.method).toBe('DELETE')
    expect(store.restore()?.pendingEmail).toBeUndefined()

    const reasons = []
    for (let i = 0; i < 5; i++) reasons.push(await store.requestEmailChange(account, 'x@example.com', 'pw'))
    expect(reasons.map((r) => !r.ok && r.reason)).toEqual(['wrong', 'taken', 'same', 'busy', 'offline'])
  })

  it('confirms an email link without a sign-in token, and tells used and taken links apart', async () => {
    const { fetchFn, calls } = server(
      { body: { email: 'juan@example.com' } },
      { status: 422, body: { errors: { token: ['invalid'] } } },
      { status: 422, body: { errors: { token: ['taken'] } } },
    )
    const store = createApiStore(BASE, fetchFn)
    localStorage.setItem('bulig.token', '1|abc')

    expect(await store.confirmEmail('t0k3n')).toEqual({ ok: true, email: 'juan@example.com' })
    expect(calls[0].url).toBe(`${BASE}/auth/confirm-email`)
    expect(body(calls[0].init)).toEqual({ token: 't0k3n' })
    expect(header(calls[0].init, 'Authorization')).toBeUndefined()
    expect(await store.confirmEmail('used')).toEqual({ ok: false, reason: 'invalid' })
    expect(await store.confirmEmail('raced')).toEqual({ ok: false, reason: 'taken' })
  })

  it('reads the pending email from the server account', async () => {
    const { fetchFn } = server({ body: { token: '1|abc', user: { ...user, pendingEmail: 'new@example.com' } } })
    const result = await createApiStore(BASE, fetchFn).signIn('ana@example.com', 'long enough')
    expect(result.ok && result.account.pendingEmail).toBe('new@example.com')
  })

  it('reads the photo URL from the server account', async () => {
    const { fetchFn } = server({ body: { token: '1|abc', user: { ...user, photoUrl: 'https://res.cloudinary.com/p.webp' } } })
    const result = await createApiStore(BASE, fetchFn).signIn('ana@example.com', 'long enough')
    expect(result.ok && result.account.photo).toBe('https://res.cloudinary.com/p.webp')
  })

  it('saves and unsaves hearts on the server, and sends old phone hearts once on sign-in', async () => {
    localStorage.setItem('bulig.saved.ana@example.com', JSON.stringify(['ph-old-shop']))
    const { fetchFn, calls } = server({ body: { token: '1|abc', user } }, { status: 204 }, { status: 204 }, { status: 204 })
    const store = createApiStore(BASE, fetchFn)

    const signed = await store.signIn('ana@example.com', 'long enough')
    if (!signed.ok) throw new Error('sign-in failed')
    await store.setSaved(signed.account, 'ph-a', true, ['ph-a'])
    await store.setSaved(signed.account, 'ph-a', false, [])

    expect(calls.slice(1).map((c) => `${c.init.method} ${c.url.replace(BASE, '')}`)).toEqual([
      'PUT /me/saved/ph-old-shop',
      'PUT /me/saved/ph-a',
      'DELETE /me/saved/ph-a',
    ])
    expect(localStorage.getItem('bulig.saved.ana@example.com')).toBeNull()
  })

  it('signs out on the phone even with no signal', async () => {
    localStorage.setItem('bulig.token', '1|abc')
    const store = createApiStore(BASE, server(new TypeError('Failed to fetch')).fetchFn)
    await store.signOut()
    expect(localStorage.getItem('bulig.token')).toBeNull()
  })

  it('never unlocks a role it does not know', async () => {
    const store = createApiStore(BASE, server({ body: { token: 't', user: { ...user, role: 'superuser' } } }).fetchFn)
    const result = await store.signIn('ana@example.com', 'x')
    expect(result.ok && result.account.role).toBe('user')
  })
})

describe('toE164', () => {
  it.each([
    ['0917 123 4567', '+639171234567'],
    ['+63 917 123 4567', '+639171234567'],
    ['639171234567', '+639171234567'],
  ])('%s → %s', (input, out) => expect(toE164(input)).toBe(out))
})
