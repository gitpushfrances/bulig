import { usePhoneLocation } from '../location/context.ts'
import { byDistance } from '../rules/nearby.ts'
import { filterServices } from '../rules/services.ts'
import { useAppData } from './context.ts'

// What every page needs to show places: the current area's services, nearest first when GPS is on.
export function useNearby() {
  const { data, area } = useAppData()
  const { position } = usePhoneLocation()
  const ready = data.status === 'ready'

  const areaNames = new Map(ready ? data.areas.map((a) => [a.id, a.name]) : [])
  const areaName = area ? areaNames.get(area) : undefined
  const ranked = byDistance(ready ? filterServices(data.services, { area }) : [], position)

  return {
    ready,
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
