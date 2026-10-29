import { CircleUser, CloudOff, Heart, House, LayoutGrid, Map as MapIcon, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'
import { useAppData } from '../data/context.ts'
import { ICON_STROKE } from './icons.ts'
import LocationBar from './LocationBar.tsx'
import styles from './Layout.module.css'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
  // Other paths that belong to this tab, such as /about under Profile.
  also?: string[]
}

const tabs: Tab[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/services', label: 'Services', icon: LayoutGrid },
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/saved', label: 'Saved', icon: Heart },
  { to: '/profile', label: 'Profile', icon: CircleUser, also: ['/about', '/help', '/terms', '/privacy', '/licenses'] },
]

function isActive({ to, also }: Tab, pathname: string): boolean {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`) || !!also?.includes(pathname)
}

// Emergency is not a tab: a red button floats on every screen and opens it; Back returns here.
// The Map draws its own (in its control stack), and Emergency needs none.
function EmergencyButton({ pathname }: { pathname: string }) {
  if (pathname === '/emergency' || pathname === '/map') return null
  return (
    <Link to="/emergency" className={styles.fab} aria-label="Emergency numbers">
      <TriangleAlert size={24} strokeWidth={2.25} aria-hidden="true" />
    </Link>
  )
}

function Mark() {
  return (
    <span className={styles.logo} aria-hidden="true">
      <svg viewBox="6 4 20 24" width="20" height="20">
        <path
          fill="currentColor"
          d="M11 7h6.5a5 5 0 0 1 3.2 8.8A5.3 5.3 0 0 1 18 25h-7zm3.4 3v4.6h2.9a2.3 2.3 0 0 0 0-4.6zm0 7.5V22h3.4a2.25 2.25 0 0 0 0-4.5z"
        />
      </svg>
    </span>
  )
}

// Phones: a top bar and a bottom tab bar in thumb reach. Tablets: a rail on the left.
// Desktops: a labelled sidebar. One nav element, laid out by CSS.
export default function Layout() {
  const { online } = useAppData()
  const { pathname } = useLocation()

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>

      <nav className={styles.nav} aria-label="Main">
        <Link to="/" className={styles.navBrand} aria-label="Bulig home">
          <Mark />
          <span className={styles.navName}>Bulig</span>
        </Link>
        <div className={styles.tabs}>
          {tabs.map((tab) => {
            const active = isActive(tab, pathname)
            const Icon = tab.icon
            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                className={active ? `${styles.tab} ${styles.active}` : styles.tab}
              >
                <span className={styles.tabIcon}>
                  <Icon size={22} strokeWidth={active ? 2 : ICON_STROKE} aria-hidden="true" />
                </span>
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className={styles.column}>
        <header className={styles.topbar}>
          <Link to="/" className={styles.brand} aria-label="Bulig home">
            <Mark />
            <span className={styles.name}>Bulig</span>
          </Link>
          <div className={styles.topbarEnd}>
            {!online && (
              <p className={styles.status} role="status">
                <CloudOff size={15} strokeWidth={2} aria-hidden="true" />
                <span>Offline</span>
              </p>
            )}
            <LocationBar />
          </div>
        </header>
        <main id="main" className={pathname === '/map' ? `${styles.main} ${styles.flush}` : styles.main}>
          {/* Keyed by path: each tab change mounts fresh and fades in (index.css respects reduced motion). */}
          <div key={pathname} className={styles.view}>
            <Outlet />
          </div>
        </main>
      </div>
      <EmergencyButton pathname={pathname} />
    </div>
  )
}
