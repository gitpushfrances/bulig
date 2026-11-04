import { CloudSlash, Heart, House, type Icon, MapTrifold as MapIcon, SquaresFour, Warning } from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigationType } from 'react-router'
import { useAppData } from '../data/context.ts'
import Avatar from './Avatar.tsx'
import styles from './Layout.module.css'

interface Tab {
  to: string
  label: string
  // Profile has no icon: it shows the person's photo, or Ropi's head.
  icon?: Icon
  // Other paths that belong to this tab, such as /about under Profile.
  also?: string[]
}

const tabs: Tab[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/services', label: 'Services', icon: SquaresFour, also: ['/nearby', '/place'] },
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/saved', label: 'Saved', icon: Heart },
  { to: '/profile', label: 'Profile', also: ['/about', '/help', '/terms', '/privacy', '/licenses'] },
]

const INSTANT_PATHS = ['/emergency', '/map']

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
      <Warning size={24} aria-hidden="true" />
    </Link>
  )
}

// Where each history entry was scrolled to, by its location key.
const scrollPositions = new Map<string, number>()

// A new page opens at its top, like an app screen; Back and Forward return to exactly where the
// person was. The browser's own restoration guesses wrong here, because pages remount on return.
function useScrollMemory() {
  const { key } = useLocation()
  const type = useNavigationType()
  const current = useRef(key)

  useEffect(() => {
    history.scrollRestoration = 'manual'
    const save = () => scrollPositions.set(current.current, window.scrollY)
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [])

  useLayoutEffect(() => {
    current.current = key
    window.scrollTo(0, type === 'POP' ? (scrollPositions.get(key) ?? 0) : 0)
  }, [key, type])
}

// No top bar: content starts at the top of the screen. Where you are lives on Home, between the
// services and the emergency numbers. Phones: a bottom tab bar in thumb reach. Tablets: a rail on
// the left. Desktops: a labelled sidebar. One nav element, laid out by CSS.
export default function Layout() {
  const { online } = useAppData()
  const { pathname } = useLocation()
  useScrollMemory()

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
                    <Icon size={22} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
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
            <CloudSlash size={15} aria-hidden="true" />
            Offline: showing saved info
          </p>
        )}
        <main id="main" className={pathname === '/map' ? `${styles.main} ${styles.flush}` : styles.main}>
          {/* Keyed by path: each page mounts fresh and fades in (index.css, "Page enter"). The tab bar
              stays outside, so it never blinks. Emergency and the Map appear at once: one is reached
              in a hurry, the other is a heavy canvas carrying its own Emergency button. */}
          <div key={pathname} className={INSTANT_PATHS.includes(pathname) ? undefined : 'page-enter'}>
            <Outlet />
          </div>
        </main>
      </div>
      <EmergencyButton pathname={pathname} />
    </div>
  )
}
