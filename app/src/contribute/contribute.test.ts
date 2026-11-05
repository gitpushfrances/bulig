import { describe, expect, it, vi } from 'vitest'
import { checkStep, EMPTY_DRAFT, loadDraft, saveDraft, toChanges, UPLOAD_LIFE_MS, weeklyHoursOf, type Draft } from './draft.ts'
import { createApiContribute, type MySubmission } from './store.ts'
import { markAllSeen, unreadIds } from './updates.ts'

const full: Draft = {
  ...EMPTY_DRAFT,
  category: 'tire_repair',
  name: ' Aling Nena Vulcanizing ',
  lat: 11.0323456,
  lng: 125.7214567,
  area: 'ph-eastern-samar-guiuan',
  landmark: 'Beside the Petron, blue gate',
  opens: '06:00',
  closes: '20:00',
  features: ['tubeless', 'air_pump', 'emergency_room'],
  phone: '0917 555 0199',
  photos: [{ id: 'upl_1', uploadedAt: Date.now(), source: 'camera', thumb: 'data:,' }],
}

describe('toChanges', () => {
  it('builds the new_place changes the API expects', () => {
    const result = toChanges(full)
    expect(result).toEqual({
      ok: true,
      changes: {
        name: 'Aling Nena Vulcanizing',
        category: 'tire_repair',
        area: 'ph-eastern-samar-guiuan',
        landmark: 'Beside the Petron, blue gate',
        lat: 11.03235,
        lng: 125.72146,
        phone: '+639175550199',
        weeklyHours: expect.objectContaining({ mon: [['06:00', '20:00']], sun: [['06:00', '20:00']] }),
        // A feature that doesn't belong to the category (emergency_room) is dropped.
        features: { tubeless: true, air_pump: true },
      },
    })
  })

  it('points at the first step that still needs something', () => {
    expect(toChanges({ ...full, name: '' })).toEqual({ ok: false, step: 0 })
    expect(toChanges({ ...full, landmark: ' ' })).toEqual({ ok: false, step: 1 })
    expect(toChanges({ ...full, lat: null })).toEqual({ ok: false, step: 1 })
    expect(toChanges({ ...full, phone: '12345' })).toEqual({ ok: false, step: 2 })
    expect(toChanges({ ...full, photos: [] })).toEqual({ ok: false, step: 3 })
  })

  it('says what is missing in plain words', () => {
    expect(checkStep(0, EMPTY_DRAFT)).toBe('Pick what kind of place it is.')
    expect(checkStep(1, { ...full, landmark: '' })).toBe('Add a landmark so people can find it.')
    expect(checkStep(3, { ...full, photos: [] })).toBe('Add at least one photo of the place.')
    expect(checkStep(2, full)).toBeNull()
  })
})

describe('weeklyHoursOf', () => {
  it('handles 24 hours, by day, and nothing given', () => {
    expect(weeklyHoursOf({ ...full, hoursMode: 'allday' })).toEqual({ open24h: true })
    expect(weeklyHoursOf({ ...full, hoursMode: 'byday', days: { mon: ['07:00', '17:00'] } })).toEqual({
      weeklyHours: { mon: [['07:00', '17:00']] },
    })
    expect(weeklyHoursOf({ ...full, opens: '', closes: '' })).toEqual({})
  })
})

describe('drafts', () => {
  it('keeps the form per account and drops photos the server has already deleted', () => {
    const old = { id: 'upl_old', uploadedAt: Date.now() - UPLOAD_LIFE_MS - 1, source: 'camera' as const, thumb: '' }
    saveDraft('c@x', { ...full, photos: [...full.photos, old] })
    const back = loadDraft('c@x')
    expect(back.name).toBe(full.name)
    expect(back.photos.map((p) => p.id)).toEqual(['upl_1'])
    expect(loadDraft('other@x')).toEqual(EMPTY_DRAFT)
    saveDraft('c@x', null)
    expect(loadDraft('c@x')).toEqual(EMPTY_DRAFT)
  })
})

// The changes for the full draft (it is complete, so this always succeeds).
function changesOf(d: Draft) {
  const r = toChanges(d)
  if (!r.ok) throw new Error('incomplete draft')
  return r.changes
}

describe('api store', () => {
  const answer = (status: number, body: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

  it('sends the photo with its source and the token', async () => {
    localStorage.setItem('bulig.token', 'tok')
    const fetchFn = answer(201, { id: 'upl_9', expiresAt: '2026-11-06T00:00:00Z' })
    const store = createApiContribute('https://api.test/api/v1', fetchFn as unknown as typeof fetch)
    expect(await store.uploadPhoto(new Blob(['x'], { type: 'image/webp' }), 'camera')).toEqual({ ok: true, id: 'upl_9' })
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.test/api/v1/uploads')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect((init.body as FormData).get('source')).toBe('camera')
  })

  it('maps the server answers for a new place', async () => {
    const send = (status: number, body: unknown = {}) =>
      createApiContribute('https://api.test', answer(status, body) as unknown as typeof fetch).submitNewPlace({
        changes: changesOf(full),
        photoIds: ['upl_1'],
        seenAt: '2026-11-05',
      })
    expect(await send(201, { id: 'sub_1', status: 'pending' })).toEqual({ ok: true, id: 'sub_1' })
    expect(await send(429)).toEqual({ ok: false, reason: 'busy' })
    expect(await send(423)).toEqual({ ok: false, reason: 'closed' })
    expect(await send(403)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await send(422, { errors: { 'photoIds.0': ['gone'] } })).toEqual({ ok: false, reason: 'photo' })
    expect(await send(422, { errors: { landmark: ['required'] } })).toEqual({ ok: false, reason: 'invalid' })
  })

  it('sends reason new_place with the changes', async () => {
    const fetchFn = answer(201, { id: 'sub_1' })
    const store = createApiContribute('https://api.test', fetchFn as unknown as typeof fetch)
    await store.submitNewPlace({ changes: changesOf(full), photoIds: ['upl_1'], seenAt: '2026-11-05', note: 'hi' })
    const body = JSON.parse((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body).toMatchObject({ recordType: 'service', reason: 'new_place', photoIds: ['upl_1'], seenAt: '2026-11-05', note: 'hi' })
    expect(body.recordId).toBeUndefined()
  })
})

describe('the bell', () => {
  const sub = (id: string, status: MySubmission['status']): MySubmission => ({
    id,
    recordId: null,
    recordName: id,
    reason: 'new_place',
    status,
    reviewNote: null,
    createdAt: '2026-11-05T00:00:00Z',
    reviewedAt: null,
  })

  it('counts answers the person has not seen, never ones still waiting', () => {
    const items = [sub('a', 'approved'), sub('b', 'pending'), sub('c', 'rejected')]
    expect(unreadIds('c@x', items)).toEqual(['a', 'c'])
    markAllSeen('c@x', items)
    expect(unreadIds('c@x', items)).toEqual([])
    // Waiting, then answered: new again.
    expect(unreadIds('c@x', [sub('b', 'approved')])).toEqual(['b'])
  })
})
