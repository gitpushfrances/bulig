import type { Area, CountryCode, EmergencyContact, Envelope, Labels, Service } from '../types.ts'

// Pages never fetch data themselves. Phase 2 uses JsonSource; Phase 4 adds ApiSource.
export interface DataSource {
  areas(country: CountryCode): Promise<Envelope<Area>>
  emergencyContacts(country: CountryCode): Promise<Envelope<EmergencyContact>>
  services(country: CountryCode): Promise<Envelope<Service>>
  labels(country: CountryCode): Promise<Labels>
}
