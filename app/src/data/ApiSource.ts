import type { Area, CountryCode, EmergencyContact, Envelope, Labels, Service } from '../types.ts'
import type { DataSource, PlaceQuery } from './DataSource.ts'
import { jsonSource } from './JsonSource.ts'
import { splitEnvelope, type FileKind } from './validate.ts'

// Reads the same envelopes from the backend (docs/API.md §3). The API is on a free server that
// sleeps and takes about a minute to wake, so every call gives up after a few seconds and the
// app uses the JSON files bundled with it instead. Emergency numbers never wait on the server.

export const API_TIMEOUT_MS = 4000

type Fetch = typeof fetch

// "&bbox=125.5,11,125.75,11.25", "&ids=a,b" or "&area=…" (API.md §3.3).
export function placeParams(query: PlaceQuery): string {
  if ('bbox' in query) return `&bbox=${query.bbox.join(',')}`
  if ('ids' in query) return `&ids=${query.ids.map(encodeURIComponent).join(',')}`
  return `&area=${encodeURIComponent(query.area)}`
}

export function createApiSource(
  baseUrl: string,
  fetchFn: Fetch = fetch,
  timeoutMs = API_TIMEOUT_MS,
  onDropped: (path: string, problems: string[]) => void = (path, problems) =>
    console.warn(`Bulig: ${path} skipped ${problems.length} record(s) that break the contract.`, problems),
): DataSource {
  const base = baseUrl.replace(/\/+$/, '')

  async function get(path: string, country: CountryCode, extra = ''): Promise<unknown> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchFn(`${base}/${path}?country=${encodeURIComponent(country)}${extra}`, {
        headers: { Accept: 'application/json' },
        // The API lets browsers keep these for an hour. Always ask again (a cheap 304 when nothing
        // changed), so a place added in the admin panel shows on the next open, not an hour later.
        cache: 'no-cache',
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

  async function envelope<T>(path: string, country: CountryCode, kind: FileKind, extra = ''): Promise<Envelope<T>> {
    const data = await get(path, country, extra)
    const { problems, items, dropped } = splitEnvelope(kind, data)
    if (problems.length) throw new Error(`${path}: ${problems.join('; ')}`)
    if (dropped.length) onDropped(path, dropped)
    return { ...(data as Envelope<T>), items: items as T[] }
  }

  return {
    areas: (cc) => envelope<Area>('areas', cc, 'areas'),
    emergencyContacts: (cc) => envelope<EmergencyContact>('emergency-contacts', cc, 'emergency'),
    services: (cc, query) => envelope<Service>('services', cc, 'services', placeParams(query)),
    labels: async (cc) => {
      const data = (await get('labels', cc)) as Partial<Labels> | null
      if (data?.version !== 1 || typeof data.categories !== 'object' || data.categories === null)
        throw new Error('labels: bad file')
      return data as Labels
    },
  }
}

// Each call tries the API first and, if it fails for any reason, answers from the fallback,
// marked fromBackup so DataProvider knows to try the API again once the server is awake.
export function withFallback(
  primary: DataSource,
  fallback: DataSource,
  onFallback: (what: string, err: unknown) => void = (what, err) =>
    console.warn(`Bulig: API unavailable for ${what}, using the bundled data.`, err),
): DataSource {
  const rescue = <T extends object>(what: string, attempt: Promise<T>, backup: () => Promise<T>): Promise<T> =>
    attempt.catch(async (err: unknown) => {
      onFallback(what, err)
      return { ...(await backup()), fromBackup: true as const }
    })

  return {
    areas: (cc) => rescue('areas', primary.areas(cc), () => fallback.areas(cc)),
    emergencyContacts: (cc) =>
      rescue('emergencyContacts', primary.emergencyContacts(cc), () => fallback.emergencyContacts(cc)),
    services: (cc, query) => rescue('services', primary.services(cc, query), () => fallback.services(cc, query)),
    labels: (cc) => rescue('labels', primary.labels(cc), () => fallback.labels(cc)),
  }
}

// Picked at build time: VITE_DATA_SOURCE=api with VITE_API_URL uses the backend, anything else the JSON files.
export function pickSource(env: { VITE_DATA_SOURCE?: string; VITE_API_URL?: string }): DataSource {
  if (env.VITE_DATA_SOURCE !== 'api' || !env.VITE_API_URL) return jsonSource
  return withFallback(createApiSource(env.VITE_API_URL), jsonSource)
}

export const appSource: DataSource = pickSource(import.meta.env)
