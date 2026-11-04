import { describe, expect, it, vi } from 'vitest'
import { createApiSource, pickSource, withFallback } from './ApiSource.ts'
import type { DataSource } from './DataSource.ts'
import { jsonSource } from './JsonSource.ts'

const BASE = 'https://api.test/api/v1/'

const contact = {
  id: 'ph-national-911',
  country: 'PH',
  area: null,
  name: 'National Emergency Hotline',
  kind: 'national',
  phones: ['911'],
  verifiedAt: '2026-10-29',
  source: 'EO 56',
}
const envelope = { version: 1, updatedAt: '2026-10-29T00:00:00Z', items: [contact] }

const reply = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }))

describe('createApiSource', () => {
  it('calls /<endpoint>?country= and returns the envelope', async () => {
    const fetchFn = reply(envelope)
    const api = createApiSource(BASE, fetchFn)

    await expect(api.emergencyContacts('PH')).resolves.toEqual(envelope)
    expect(fetchFn.mock.calls[0][0]).toBe('https://api.test/api/v1/emergency-contacts?country=PH')
  })

  it('rejects an HTTP error', async () => {
    const api = createApiSource(BASE, reply({ message: 'x' }, 503))
    await expect(api.areas('PH')).rejects.toThrow('areas: HTTP 503')
  })

  it('rejects a response whose envelope breaks the contract', async () => {
    const api = createApiSource(BASE, reply({ ...envelope, version: 2 }))
    await expect(api.emergencyContacts('PH')).rejects.toThrow('version must be 1')
  })

  it('skips one bad record and keeps the rest, so one typo in the panel hides nothing else', async () => {
    const bad = { ...contact, id: 'ph-bad', phones: [] }
    const onDropped = vi.fn()
    const api = createApiSource(BASE, reply({ ...envelope, items: [bad, contact] }), 1000, onDropped)

    await expect(api.emergencyContacts('PH')).resolves.toEqual(envelope)
    expect(onDropped).toHaveBeenCalledWith('emergency-contacts', [expect.stringContaining('(ph-bad): bad phones')])
  })

  it('asks the server again instead of trusting the browser cache', async () => {
    const fetchFn = reply(envelope)
    await createApiSource(BASE, fetchFn).emergencyContacts('PH')
    expect(fetchFn.mock.calls[0][1]?.cache).toBe('no-cache')
  })

  it('gives up on a sleeping server', async () => {
    const hang = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))),
    )
    const api = createApiSource(BASE, hang, 20)
    await expect(api.services('PH')).rejects.toThrow('no answer')
  })

  it('checks labels too', async () => {
    await expect(createApiSource(BASE, reply({ version: 1, categories: {} })).labels('PH')).resolves.toEqual({
      version: 1,
      categories: {},
    })
    await expect(createApiSource(BASE, reply({ message: 'x' })).labels('PH')).rejects.toThrow('labels')
  })
})

describe('withFallback', () => {
  const failing: DataSource = {
    areas: () => Promise.reject(new Error('down')),
    emergencyContacts: () => Promise.reject(new Error('down')),
    services: () => Promise.reject(new Error('down')),
    labels: () => Promise.reject(new Error('down')),
  }

  it('answers from the bundled files when the API fails, emergency numbers included', async () => {
    const onFallback = vi.fn()
    const source = withFallback(failing, jsonSource, onFallback)

    const emergency = await source.emergencyContacts('PH')
    expect(emergency.items.some((c) => c.kind === 'national')).toBe(true)
    expect(emergency.fromBackup).toBe(true)
    expect(onFallback).toHaveBeenCalledWith('emergencyContacts', expect.any(Error))
  })

  it('uses the API when it answers', async () => {
    const onFallback = vi.fn()
    const source = withFallback(createApiSource(BASE, reply(envelope)), jsonSource, onFallback)

    const answer = await source.emergencyContacts('PH')
    expect(answer).toEqual(envelope)
    expect(answer.fromBackup).toBeUndefined()
    expect(onFallback).not.toHaveBeenCalled()
  })
})

describe('pickSource', () => {
  it('uses the JSON files unless the build asks for the API', () => {
    expect(pickSource({})).toBe(jsonSource)
    expect(pickSource({ VITE_DATA_SOURCE: 'json', VITE_API_URL: BASE })).toBe(jsonSource)
    expect(pickSource({ VITE_DATA_SOURCE: 'api' })).toBe(jsonSource)
    expect(pickSource({ VITE_DATA_SOURCE: 'api', VITE_API_URL: BASE })).not.toBe(jsonSource)
  })
})
