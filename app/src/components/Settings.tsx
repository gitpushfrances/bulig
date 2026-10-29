import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import styles from '../pages/Profile.module.css'

// Grouped rows, like a phone's Settings app: a small heading, then one card of rows.
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = `group-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section className={styles.group} aria-labelledby={id}>
      <h2 id={id} className={styles.groupTitle}>
        {title}
      </h2>
      <ul className={styles.rows}>{children}</ul>
    </section>
  )
}

function Body({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: ReactNode }) {
  return (
    <>
      <Icon className={styles.rowIcon} size={20} strokeWidth={1.75} aria-hidden="true" />
      <span className={styles.rowLabel}>{label}</span>
      {value !== undefined && <span className={styles.rowValue}>{value}</span>}
    </>
  )
}

// A row that opens another screen.
export function SettingsLink(props: { to: string; icon: LucideIcon; label: string; value?: ReactNode }) {
  return (
    <li>
      <Link className={styles.row} to={props.to}>
        <Body {...props} />
        <ChevronRight className={styles.chevron} size={18} strokeWidth={2} aria-hidden="true" />
      </Link>
    </li>
  )
}

// A row that does something here (install, show steps).
export function SettingsButton(props: { icon: LucideIcon; label: string; value?: ReactNode; onClick: () => void }) {
  return (
    <li>
      <button type="button" className={styles.row} onClick={props.onClick}>
        <Body {...props} />
      </button>
    </li>
  )
}

// A row that only shows a value, or holds its own control (the theme switch).
export function SettingsInfo(props: { icon: LucideIcon; label: string; value?: ReactNode; children?: ReactNode }) {
  return (
    <li className={`${styles.row} ${styles.static}`}>
      <Body {...props} />
      {props.children}
    </li>
  )
}
