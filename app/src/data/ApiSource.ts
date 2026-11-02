import type { Area, CountryCode, EmergencyContact, Envelope, Labels, Service } from '../types.ts'
import type { DataSource } from './DataSource.ts'
import { jsonSource } from './JsonSource.ts'
import { validateEnvelope, type FileKind } from './validate.ts'

// Reads the same envelopes from the backend (docs/API.md §3). The API is on a free server that
// sleeps and takes about a minute to wake, so every call gives up after a few seconds and the
// app uses the JSON files bundled with it instead. Emergency numbers never wait on the server.

export const API_TIMEOUT_MS = 4000

type Fetch = typeof fetch

export function createApiSource(baseUrl: string, fetchFn: Fetch = fetch, timeoutMs = API_TIMEOUT_MS): DataSource {
  const base = baseUrl.replace(/\/+$/, '')

  async function get(path: string, country: CountryCode): Promise<unknown> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchFn(`${base}/${path}?country=${encodeURIComponent(country)}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (controller.signal.aborted) throw new Error(`${path}: no answer in ${timeoutMs / 1000} s`, { cause: err })
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  async function envelope<T>(path: string, country: CountryCode, kind: FileKind): Promise<Envelope<T>> {
    const data = await get(path, country)
    const problems = validateEnvelope(kind, data)
    if (problems.length) throw new Error(`${path}: ${problems.join('; ')}`)
    return data as Envelope<T>
  }

  return {
    areas: (cc) => envelope<Area>('areas', cc, 'areas'),
    emergencyContacts: (cc) => envelope<EmergencyContact>('emergency-contacts', cc, 'emergency'),
    services: (cc) => envelope<Service>('services', cc, 'services'),
    labels: async (cc) => {
      const data = (await get('labels', cc)) as Partial<Labels> | null
      if (data?.version !== 1 || typeof data.categories !== 'object' || data.categories === null)
        throw new Error('labels: bad file')
      return data as Labels
    },
  }
}

// Each call tries the API first and, if it fails for any reason, answers from the fallback.
export function withFallback(
  primary: DataSource,
  fallback: DataSource,
  onFallback: (what: string, err: unknown) => void = (what, err) =>
    console.warn(`Bulig: API unavailable for ${what}, using the bundled data.`, err),
): DataSource {
  const rescue = <T>(what: string, attempt: Promise<T>, backup: () => Promise<T>): Promise<T> =>
    attempt.catch((err: unknown) => {
      onFallback(what, err)
      return backup()
    })

  return {
    areas: (cc) => rescue('areas', primary.areas(cc), () => fallback.areas(cc)),
    emergencyContacts: (cc) =>
      rescue('emergencyContacts', primary.emergencyContacts(cc), () => fallback.emergencyContacts(cc)),
    services: (cc) => rescue('services', primary.services(cc), () => fallback.services(cc)),
    labels: (cc) => rescue('labels', primary.labels(cc), () => fallback.labels(cc)),
  }
}

// Picked at build time: VITE_DATA_SOURCE=api with VITE_API_URL uses the backend, anything else the JSON files.
export function pickSource(env: { VITE_DATA_SOURCE?: string; VITE_API_URL?: string }): DataSource {
  if (env.VITE_DATA_SOURCE !== 'api' || !env.VITE_API_URL) return jsonSource
  return withFallback(createApiSource(env.VITE_API_URL), jsonSource)
}

export const appSource: DataSource = pickSource(import.meta.env)
