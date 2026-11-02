import type { Area, CountryCode, EmergencyContact, Envelope, Labels, Service } from '../types.ts'

// Pages never fetch data themselves. JsonSource reads the bundled files; ApiSource reads the backend
// and falls back to them (VITE_DATA_SOURCE=api).
export interface DataSource {
  areas(country: CountryCode): Promise<Envelope<Area>>
  emergencyContacts(country: CountryCode): Promise<Envelope<EmergencyContact>>
  services(country: CountryCode): Promise<Envelope<Service>>
  labels(country: CountryCode): Promise<Labels>
}
