import { ChevronDown, LocateFixed, LocateOff, RotateCw } from 'lucide-react'
import { useAppData } from '../data/context.ts'
import { shortAddress } from '../location/address.ts'
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
  const { status, address, refresh } = usePhoneLocation()
  const { data, area, areaKm, setArea } = useAppData()
  if (data.status !== 'ready') return null

  const name = data.areas.find((a) => a.id === area)?.name
  const fromGps = areaKm !== null
  const locating = status === 'locating'
  const canRetry = status !== 'unavailable'
  const street = address ? shortAddress(address.address) : ''

  // Top line says how we know; the bottom line says where. The looked-up barangay and town win;
  // without them, the nearest listed area (and how far it is when it isn't really "here").
  let place: string | null = null
  if (fromGps) place = street || (areaKm <= NEAR_KM ? name ?? null : `${name}, ${formatDistance(areaKm)} away`)
  else if (locating) place = street || 'Finding your location'
  const full = address
    ? [address.address.locality, address.address.municipality, address.address.province, address.address.postcode]
        .filter(Boolean)
        .join(', ')
    : undefined

  return (
    <div className={styles.location}>
      {place ? (
        <p className={styles.locationText} aria-live="polite" title={full}>
          <LocateFixed size={18} strokeWidth={2} aria-hidden="true" />
          <span className={styles.locationLines}>
            <span className={styles.locationLabel}>{fromGps ? 'Near you' : 'Locating'}</span>
            <span className={styles.locationPlace}>{place}</span>
          </span>
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
