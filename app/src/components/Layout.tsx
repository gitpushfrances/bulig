import { CloudOff, Heart, House, LayoutGrid, Map as MapIcon, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'
import { useAppData } from '../data/context.ts'
import Avatar from './Avatar.tsx'
import { ICON_STROKE } from './icons.ts'
import styles from './Layout.module.css'

interface Tab {
  to: string
  label: string
  // Profile has no icon: it shows the person's photo, or Ropi's head.
  icon?: LucideIcon
  // Other paths that belong to this tab, such as /about under Profile.
  also?: string[]
}

const tabs: Tab[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/services', label: 'Services', icon: LayoutGrid, also: ['/nearby'] },
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/saved', label: 'Saved', icon: Heart },
  { to: '/profile', label: 'Profile', also: ['/about', '/help', '/terms', '/privacy', '/licenses'] },
]

function isActive({ to, also }: Tab, pathname: string): boolean {
  if (to === '/') return pathname === '/'
  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`)
  return under(to) || !!also?.some(under)
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

// No top bar: content starts at the top of the screen. Where you are lives on Home, between the
// services and the emergency numbers. Phones: a bottom tab bar in thumb reach. Tablets: a rail on
// the left. Desktops: a labelled sidebar. One nav element, laid out by CSS.
export default function Layout() {
  const { online } = useAppData()
  const { pathname } = useLocation()

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>

      <nav className={styles.nav} aria-label="Main">
        <p className={styles.navName}>Bulig</p>
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
                <span className={`${styles.tabIcon} ${Icon ? '' : styles.tabAvatar}`}>
                  {Icon ? (
                    <Icon size={22} strokeWidth={active ? 2 : ICON_STROKE} aria-hidden="true" />
                  ) : (
                    <Avatar size={26} ring={active} />
                  )}
                </span>
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className={styles.column}>
        {!online && (
          <p className={styles.offline} role="status">
            <CloudOff size={15} strokeWidth={2} aria-hidden="true" />
            Offline: showing saved info
          </p>
        )}
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
