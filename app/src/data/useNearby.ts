import { usePhoneLocation } from '../location/context.ts'
import { byDistance } from '../rules/nearby.ts'
import { filterServices } from '../rules/services.ts'
import { useAppData } from './context.ts'

// What every page needs to show places: the current area's services, nearest first when GPS is on.
export const UNPLACED_TEXT = 'Turn on location, or pick your town on Home, to see places near you.'
export function useNearby() {
  const { data, area, nearLoading } = useAppData()
  const { position, settling } = usePhoneLocation()
  const pool = data.status === 'ready' ? filterServices(data.services, { area }) : []
  // With no area known yet, wait for the first fix instead of listing every area and then jumping.
  // A new spot whose places haven't answered waits too, unless some are already here (driving on).
  const ready = data.status === 'ready' && !(settling && area === null) && !(nearLoading && pool.length === 0)

  const areaNames = new Map(ready ? data.areas.map((a) => [a.id, a.name]) : [])
  const areaName = area ? areaNames.get(area) : undefined
  const ranked = byDistance(ready ? pool : [], position)

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
    // No GPS and no town picked: places load only around a point (API.md §3.3), so there is nothing to
    // list yet. Pages ask for location or a town instead of saying nothing is listed.
    unplaced: ready && !area && !position,
    labels: ready ? data.labels : null,
    position,
  }
}
