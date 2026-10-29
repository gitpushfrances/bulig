import { Bookmark, CircleUser, CloudOff, MapPin, Siren, type LucideIcon } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'
import { useAppData } from '../data/context.ts'
import { ICON_STROKE } from './icons.ts'
import styles from './Layout.module.css'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
  // Other paths that belong to this tab, such as /about under Account.
  also?: string[]
}

const tabs: Tab[] = [
  { to: '/', label: 'Emergency', icon: Siren },
  { to: '/services', label: 'Services', icon: MapPin },
  { to: '/saved', label: 'Saved', icon: Bookmark },
  { to: '/account', label: 'Account', icon: CircleUser, also: ['/about'] },
]

export default function Layout() {
  const { online } = useAppData()
  const { pathname } = useLocation()

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand} aria-label="Bulig home">
            <span className={styles.logo} aria-hidden="true">
              <svg viewBox="6 4 20 24" width="22" height="22">
                <path
                  fill="currentColor"
                  d="M11 7h6.5a5 5 0 0 1 3.2 8.8A5.3 5.3 0 0 1 18 25h-7zm3.4 3v4.6h2.9a2.3 2.3 0 0 0 0-4.6zm0 7.5V22h3.4a2.25 2.25 0 0 0 0-4.5z"
                />
              </svg>
            </span>
            <span>
              <span className={styles.name}>Bulig</span>
              <span className={styles.tagline}>Help Along the Way</span>
            </span>
          </Link>
          {!online && (
            <p className={styles.status} role="status">
              <CloudOff size={16} strokeWidth={2} aria-hidden="true" />
              Offline, showing saved data
            </p>
          )}
          <nav className={styles.tabbar} aria-label="Main">
            {tabs.map(({ to, label, icon: Icon, also }) => {
              const active = pathname === to || !!also?.includes(pathname)
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={active ? `${styles.tab} ${styles.active}` : styles.tab}
                >
                  <span className={styles.tabIcon}>
                    <Icon size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  </span>
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
