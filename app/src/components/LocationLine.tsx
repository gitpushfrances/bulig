import { ArrowClockwise, CaretDown, Crosshair, GpsSlash } from '@phosphor-icons/react'
import { useAppData } from '../data/context.ts'
import { usePhoneLocation } from '../location/context.ts'
import { NEAR_KM, formatDistance } from '../rules/nearby.ts'
import type { Area } from '../types.ts'
import styles from './LocationLine.module.css'

// Areas grouped under their region, regions in alphabetical order.
function byRegion(areas: Area[]): [string, Area[]][] {
  const groups = new Map<string, Area[]>()
  for (const a of [...areas].sort((x, y) => x.name.localeCompare(y.name))) {
    groups.set(a.region, [...(groups.get(a.region) ?? []), a])
  }
  return [...groups].sort(([x], [y]) => x.localeCompare(y))
}

const timeFormat = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' })

// Where the phone is, as one plain line of text between hairlines: a divider, not a card.
// "Lahug · Cebu City · Cebu · 6000" over "Updated 2:41 PM", with a reload button. It comes from
// GPS and follows the driver; only without GPS (denied, missing, failed) can the person pick an area.
// `inHeader`: under the greeting on Home, without the hairlines.
export default function LocationLine({ inHeader = false }: { inHeader?: boolean }) {
  const { status, address, updatedAt, refresh } = usePhoneLocation()
  const { data, area, areaKm, setArea } = useAppData()
  if (data.status !== 'ready') return null

  const listed = data.areas.find((a) => a.id === area)
  const fromGps = areaKm !== null
  const locating = status === 'locating'
  const canRetry = status !== 'unavailable'

  // The looked-up address wins; without it, the nearest listed area (and how far, when it isn't here).
  // In Home's header: one line, so the barangay and town only (no province, no postcode).
  const parts = address
    ? inHeader
      ? [address.address.locality, address.address.municipality]
      : [address.address.locality, address.address.municipality, address.address.province, address.address.postcode]
    : []
  let place = parts.filter(Boolean).join(' · ')
  if (!place && fromGps && listed)
    place = areaKm <= NEAR_KM ? `${listed.name} · ${listed.region}` : `${listed.name}, ${formatDistance(areaKm)} away`

  const when = address?.at ?? updatedAt
  // The header updates live, so it skips "Updated <time>".
  const note = locating ? 'Finding your location…' : when && !inHeader ? `Updated ${timeFormat.format(when)}` : null

  return (
    <div className={inHeader ? `${styles.line} ${styles.inHeader}` : styles.line}>
      {place ? (
        <div className={styles.text} aria-live="polite">
          <Crosshair className={styles.icon} size={18} aria-hidden="true" />
          <div className={styles.words}>
            <p className={styles.place} title={place}>
              {place}
            </p>
            {note && <p className={styles.meta}>{note}</p>}
          </div>
        </div>
      ) : locating ? (
        <div className={styles.text} aria-live="polite">
          <Crosshair className={styles.icon} size={18} aria-hidden="true" />
          <p className={styles.meta}>Finding your location…</p>
        </div>
      ) : (
        <label className={styles.pick}>
          <GpsSlash className={styles.icon} size={18} aria-hidden="true" />
          <span className={styles.words}>
            <span className={styles.meta}>Location is off. Pick your area:</span>
            <span className={styles.select}>
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
              <CaretDown size={16} aria-hidden="true" />
            </span>
          </span>
        </label>
      )}
      {canRetry && !(inHeader && place) && (
        <button
          type="button"
          className={styles.refresh}
          aria-label="Update my location"
          aria-busy={locating}
          onClick={refresh}
        >
          <ArrowClockwise size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
