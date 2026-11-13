import type { Area, CountryCode, EmergencyContact, Envelope, Labels, Service } from '../types.ts'
import type { Box } from './cells.ts'

// Which places to read (API.md §3.3): one map square, some IDs, or one area. Never the whole country.
export type PlaceQuery = { bbox: Box } | { ids: string[] } | { area: string }

// Pages never fetch data themselves. JsonSource reads the bundled files; ApiSource reads the backend
// and falls back to them (VITE_DATA_SOURCE=api).
export interface DataSource {
  areas(country: CountryCode): Promise<Envelope<Area>>
  emergencyContacts(country: CountryCode): Promise<Envelope<EmergencyContact>>
  services(country: CountryCode, query: PlaceQuery): Promise<Envelope<Service>>
  labels(country: CountryCode): Promise<Labels>
}
