import { ChevronDown, LocateFixed, LocateOff, RotateCw } from 'lucide-react'
import { useAppData } from '../data/context.ts'
import { usePhoneLocation } from '../location/context.ts'
import { NEAR_KM, formatDistance } from '../rules/nearby.ts'
import type { Area } from '../types.ts'
import styles from './Layout.module.css'

// Areas grouped under their region, regions in alphabetical order.
function byRegion(areas: Area[]): [string, Area[]][] {
  const groups = new Map<string, Area[]>()
  for (const a of [...areas].sort((x, y) => x.name.localeCompare(y.name))) {
    groups.set(a.region, [...(groups.get(a.region) ?? []), a])
  }
  return [...groups].sort(([x], [y]) => x.localeCompare(y))
}

// Where the app thinks the phone is. It comes from GPS and follows the driver; the button asks for a
// fresh fix. Only when there is no GPS (denied, missing, failed) can the person pick an area.
export default function LocationBar() {
  const { status, refresh } = usePhoneLocation()
  const { data, area, areaKm, setArea } = useAppData()
  if (data.status !== 'ready') return null

  const name = data.areas.find((a) => a.id === area)?.name
  const fromGps = areaKm !== null
  const locating = status === 'locating'
  const canRetry = status !== 'unavailable'

  let label: string | null = null
  if (fromGps && name) label = areaKm <= NEAR_KM ? `Near ${name}` : `${name} · ${formatDistance(areaKm)} away`
  else if (locating) label = 'Finding your location'

  return (
    <div className={styles.location}>
      {label ? (
        <p className={styles.locationText} aria-live="polite">
          <LocateFixed size={16} strokeWidth={2} aria-hidden="true" />
          <span>{label}</span>
        </p>
      ) : (
        <label className={styles.locationPick} title="Location is off. Pick the area you're in.">
          <LocateOff size={16} strokeWidth={2} aria-hidden="true" />
          <select aria-label="Area" value={area ?? ''} onChange={(e) => setArea(e.target.value || null)}>
            <option value="">All areas</option>
            {byRegion(data.areas).map(([region, areas]) => (
              <optgroup key={region} label={region}>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
        </label>
      )}
      {canRetry && (
        <button
          type="button"
          className={styles.refresh}
          aria-label="Update my location"
          aria-busy={locating}
          onClick={refresh}
        >
          <RotateCw size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
