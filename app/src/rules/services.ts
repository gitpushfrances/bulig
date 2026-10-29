import type { AreaId, Category, Service } from '../types.ts'

export interface ServiceFilter {
  area?: AreaId | null
  category?: Category | null
  query?: string
}

export function filterServices(services: Service[], { area, category, query }: ServiceFilter): Service[] {
  const q = query?.trim().toLowerCase() ?? ''
  return services
    .filter((s) => !area || s.area === area)
    .filter((s) => !category || s.category === category)
    .filter((s) => !q || `${s.name} ${s.landmark}`.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// A place listed in the last 60 days shows a NEW badge, so new stalls get noticed.
// It never changes the order: nearest still comes first.
export const NEW_FOR_DAYS = 60

export function isNew(service: Service, now: Date): boolean {
  if (!service.addedAt) return false
  const days = (now.getTime() - Date.parse(service.addedAt)) / 86_400_000
  return days >= 0 && days <= NEW_FOR_DAYS
}
