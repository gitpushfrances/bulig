import type { Area, CountryCode, EmergencyContact, Envelope, Labels, Service } from '../types.ts'
import type { DataSource } from './DataSource.ts'
import { validateEnvelope, type FileKind } from './validate.ts'

// Reads public/data/<cc>/*.json. Offline, the service worker answers from its cache.

async function getJson(country: CountryCode, file: string): Promise<unknown> {
  const res = await fetch(`/data/${country.toLowerCase()}/${file}`)
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
  return res.json()
}

async function getEnvelope<T>(country: CountryCode, file: string, kind: FileKind): Promise<Envelope<T>> {
  const data = await getJson(country, file)
  const problems = validateEnvelope(kind, data)
  if (problems.length) throw new Error(`${file}: ${problems.join('; ')}`)
  return data as Envelope<T>
}

export const jsonSource: DataSource = {
  areas: (cc) => getEnvelope<Area>(cc, 'areas.json', 'areas'),
  emergencyContacts: (cc) => getEnvelope<EmergencyContact>(cc, 'emergency-contacts.json', 'emergency'),
  services: (cc) => getEnvelope<Service>(cc, 'services.json', 'services'),
  labels: async (cc) => (await getJson(cc, 'labels.json')) as Labels,
}
