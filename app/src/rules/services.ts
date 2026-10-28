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
