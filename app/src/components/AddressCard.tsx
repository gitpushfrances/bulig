import { LocateOff } from 'lucide-react'
import { useAppData } from '../data/context.ts'
import { timeAgo } from '../data/format.ts'
import { addressLabel } from '../data/labels.ts'
import { ADDRESS_PARTS, type Address } from '../location/address.ts'
import { usePhoneLocation } from '../location/context.ts'
import { NEAR_KM } from '../rules/nearby.ts'
import styles from '../pages/Page.module.css'

// Where the phone is, in the country's own address words: barangay, city or municipality, province,
// ZIP code in PH. From the address lookup when online; from the nearest listed area otherwise.
export default function AddressCard() {
  const { status, address } = usePhoneLocation()
  const { data, area, areaKm } = useAppData()
  const labels = data.status === 'ready' ? data.labels : null
  const listed = data.status === 'ready' ? data.areas.find((a) => a.id === area) : undefined

  if (!address && areaKm === null && status !== 'locating') {
    return (
      <div className={`${styles.card} ${styles.addressOff}`}>
        <LocateOff size={20} strokeWidth={1.75} aria-hidden="true" />
        <p>
          <strong>Location is off.</strong> Turn it on in your phone settings to see your barangay and the
          nearest places first.
        </p>
      </div>
    )
  }

  const nearListed = listed && areaKm !== null && areaKm <= NEAR_KM
  // The lookup wins part by part; the nearest listed area fills what it left out (often the province).
  const fromArea: Address = nearListed ? { municipality: listed.name, province: listed.region } : {}
  const found = Object.fromEntries(Object.entries(address?.address ?? {}).filter(([, v]) => v)) as Address
  const parts: Address = { ...fromArea, ...found }
  const note =
    status === 'locating'
      ? 'Updating'
      : address
        ? `Updated ${timeAgo(address.at)}`
        : nearListed
          ? 'Approximate, from the nearest town'
          : 'Address not available offline'

  return (
    <section className={styles.card} aria-labelledby="address-title">
      <div className={styles.sectionHead}>
        <h2 id="address-title" className={styles.sectionTitle}>
          Your location
        </h2>
        <p className={styles.count} aria-live="polite">
          {note}
        </p>
      </div>
      <dl className={styles.addressGrid}>
        {ADDRESS_PARTS.map((part) => (
          <div key={part}>
            <dt>{addressLabel(part, labels)}</dt>
            <dd className={parts[part] ? undefined : styles.missing}>{parts[part] ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
