import { usePhoneLocation } from '../location/context.ts'
import { byDistance } from '../rules/nearby.ts'
import { filterServices } from '../rules/services.ts'
import { useAppData } from './context.ts'

// What every page needs to show places: the current area's services, nearest first when GPS is on.
export function useNearby() {
  const { data, area } = useAppData()
  const { position, settling } = usePhoneLocation()
  // With no area known yet, wait for the first fix instead of listing every area and then jumping.
  const ready = data.status === 'ready' && !(settling && area === null)

  const areaNames = new Map(ready ? data.areas.map((a) => [a.id, a.name]) : [])
  const areaName = area ? areaNames.get(area) : undefined
  const ranked = byDistance(ready ? filterServices(data.services, { area }) : [], position)

  return {
    ready,
    // Still fetching: pages show a skeleton. (An error is neither ready nor loading.)
    loading: data.status === 'loading' || (data.status === 'ready' && !ready),
    area,
    areaName,
    areaNames,
    // "near Cebu City" or "in all areas", for headings.
    where: areaName ? `near ${areaName}` : 'in all areas',
    ranked,
    labels: ready ? data.labels : null,
    position,
  }
}
