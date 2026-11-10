import { describe, expect, it, vi } from 'vitest'
import { createApiStaff, writeError } from './api.ts'
import { ApiError, OfflineError } from '../data/api.ts'
import { hotlinePhone, localPhone, fieldText } from './format.ts'
import { forgetStaff, invalidate, refresh, update } from './snapshot.ts'

const BASE = 'https://api.test/api/v1'
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('createApiStaff', () => {
  it('calls /staff paths with the token and no cache', async () => {
    localStorage.setItem('bulig.token', 'tok')
    const fetchFn = vi.fn(async () => json({ items: [], nextPage: null }))
    const staff = createApiStaff(BASE, fetchFn)
    await staff.users({ q: 'juan', role: '' })
    await staff.hotlines({ level: 'province' })
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${BASE}/staff/users?q=juan`)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect(init.cache).toBe('no-store')
    expect((fetchFn.mock.calls[1] as unknown as [string])[0]).toBe(`${BASE}/staff/emergency-contacts?level=province`)
  })

  it('asks for contributor requests and says "not now" the way API.md §7.8 says', async () => {
    const fetchFn = vi.fn(async () => json({ items: [], nextPage: null }))
    const staff = createApiStaff(BASE, fetchFn)
    await staff.users({ requested: true })
    await staff.declineContributor('usr_1')
    const calls = fetchFn.mock.calls as unknown as [string, RequestInit][]
    expect(calls[0][0]).toBe(`${BASE}/staff/users?requested=1`)
    expect(calls[1][0]).toBe(`${BASE}/staff/users/usr_1/contributor-request/decline`)
    expect(calls[1][1].method).toBe('POST')
  })

  it('sends the role switch, a new hotline and a reject the way API.md §7.8 says', async () => {
    const fetchFn = vi.fn(async () => json({}))
    const staff = createApiStaff(BASE, fetchFn)
    await staff.setRole('usr_1', 'contributor')
    await staff.saveHotline({
      area: 'a',
      kind: 'police',
      name: 'PNP',
      phones: ['+639171234567'],
      source: 's',
      checkedToday: true,
    })
    await staff.saveHotline(
      { area: 'a', kind: 'fire', name: 'BFP', phones: ['160'], source: 's', checkedToday: false },
      'h1',
    )
    await staff.reject('sub_1', 'duplicate')
    const calls = fetchFn.mock.calls.map((c) => {
      const [url, init] = c as unknown as [string, RequestInit]
      return [init.method, url.replace(BASE, ''), JSON.parse(String(init.body))]
    })
    expect(calls[0]).toEqual(['PATCH', '/staff/users/usr_1/role', { role: 'contributor' }])
    expect(calls[1][0]).toBe('POST')
    expect(calls[1][1]).toBe('/staff/emergency-contacts')
    expect(calls[2].slice(0, 2)).toEqual(['PATCH', '/staff/emergency-contacts/h1'])
    expect(calls[3]).toEqual(['POST', '/staff/submissions/sub_1/reject', { reason: 'duplicate' }])
  })

  it("turns a refusal into the server's words, never a throw", async () => {
    const staff = createApiStaff(BASE, async () => json({ message: 'Someone already reviewed this.' }, 422))
    expect(await staff.confirm('sub_1')).toEqual({ ok: false, message: 'Someone already reviewed this.' })
    expect(writeError(new ApiError(403, {}))).toMatch(/can't do that/)
    expect(writeError(new OfflineError('x'))).toMatch(/signal/)
  })
})

describe('snapshot cache', () => {
  const read = async (key: string, load: () => Promise<unknown>, maxAge?: number) => {
    refresh(key, load, maxAge)
    await Promise.resolve()
    await Promise.resolve()
  }

  it('shares one fetch and reuses a fresh copy', async () => {
    const load = vi.fn(async () => 1)
    refresh('k', load)
    refresh('k', load)
    await Promise.resolve()
    await read('k', load)
    expect(load).toHaveBeenCalledTimes(1)
    invalidate('k')
    await read('k', load)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('drops an answer that lands after sign-out', async () => {
    let resolve: (v: number) => void = () => {}
    const slow = () => new Promise<number>((r) => (resolve = r))
    refresh('late', slow)
    forgetStaff()
    resolve(5)
    await Promise.resolve()
    const load = vi.fn(async () => 6)
    await read('late', load)
    expect(load).toHaveBeenCalledTimes(1) // nothing was kept from before sign-out
  })

  it('changes a copy in place', async () => {
    await read('list', async () => [1, 2, 3])
    update<number[]>('list', (l) => l.filter((n) => n !== 2))
    const load = vi.fn(async () => [])
    await read('list', load)
    expect(load).not.toHaveBeenCalled()
  })
})

describe('format', () => {
  it.each([
    ['0917 123 4567', '+639171234567'],
    ['+63 917 123 4567', '+639171234567'],
    ['166', '166'],
    ['(055) 555 1234', '+63555551234'],
    ['12', null],
    ['call me', null],
  ])('hotlinePhone(%s) → %s', (input, out) => expect(hotlinePhone(input)).toBe(out))

  it('shows numbers and fields in plain words', () => {
    expect(localPhone('+639171234567')).toBe('0917 123 4567')
    expect(fieldText('weeklyHours', { mon: [['06:00', '20:00']] })).toBe('Mon 06:00–20:00')
    expect(fieldText('prices', [{ item: 'diesel', amount: 71.5 }])).toBe('diesel ₱71.50')
    expect(fieldText('name', null)).toBe('Nothing')
  })
})
