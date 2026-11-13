import {
  CloudSlash,
  Heart,
  House,
  type Icon,
  ListChecks,
  MapTrifold as MapIcon,
  Plus,
  SquaresFour,
  UsersThree,
  Warning,
} from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigationType } from 'react-router'
import { useAuth } from '../auth/context.ts'
import ReadyGate from './ReadyGate.tsx'
import { useAppData } from '../data/context.ts'
import { can } from '../rules/permissions.ts'
import { useSummary } from '../staff/hooks.ts'
import { useStaffView } from '../staff/mode.ts'
import Avatar from './Avatar.tsx'
import styles from './Layout.module.css'

interface Tab {
  to: string
  label: string
  icon: Icon
  // Other paths that belong to this tab, such as /about under Profile.
  also?: string[]
}

const tabs: Tab[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/services', label: 'Services', icon: SquaresFour, also: ['/nearby', '/place'] },
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/saved', label: 'Saved', icon: Heart },
]
// Profile is not a tab (John, 2026-11-04): the avatar in Home's header opens it, so the bar keeps
// four roomier targets. Its pages (Profile, About, Help, Terms...) still slide in like any other.

// Contributors and above get a raised Add button in the middle of the bar (John, 2026-11-05), like a
// wallet app's scan button. Teal, never red: it must never be mistaken for the Emergency button.
const ADD_TAB: Tab = { to: '/add', label: 'Add', icon: Plus }

// Moderators and admins (John, 2026-11-06): no Services or Saved; Review and Manage instead. The
// "Use the app as: Traveller" switch in Profile brings the everyday tabs back (staff/mode.ts).
const REVIEW_TAB: Tab = { to: '/review', label: 'Review', icon: ListChecks }
const staffTabs: Tab[] = [
  { to: '/', label: 'Home', icon: House },
  REVIEW_TAB,
  ADD_TAB,
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/manage', label: 'Manage', icon: UsersThree },
]

function tabsFor(canAdd: boolean, staff: boolean): Tab[] {
  if (staff) return staffTabs
  return canAdd ? [...tabs.slice(0, 2), ADD_TAB, ...tabs.slice(2)] : tabs
}

const INSTANT_PATHS = ['/emergency', '/map']
const TAB_ROOTS = [...tabs, ...staffTabs].map((t) => t.to)

// How a page arrives (index.css, "Page enter"): a tab fades up in place, a page opened from one slides
// in from the right, and Back slides the earlier page in from the left. Emergency and the Map: at once.
function enterClass(pathname: string, type: 'POP' | 'PUSH' | 'REPLACE'): string | undefined {
  if (INSTANT_PATHS.includes(pathname)) return undefined
  if (type === 'POP') return 'page-back'
  return TAB_ROOTS.includes(pathname) ? 'page-enter' : 'page-push'
}

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

// Staff screens (John, 2026-11-06): no floating button. 911 sits in a slim bar at the top of every
// screen instead, next to the profile button, so it stays one tap away (CLAUDE.md hard rule) without
// a sixth tab. The Map draws its own Emergency button.
function StaffBar({ pathname }: { pathname: string }) {
  if (pathname === '/map') return null
  return (
    <header className={styles.staffBar}>
      <p className={styles.staffName}>
        Bulig <span>Staff</span>
      </p>
      {pathname !== '/emergency' && (
        <Link to="/emergency" className={styles.sos} aria-label="Emergency numbers">
          <Warning size={18} weight="bold" aria-hidden="true" />
          911
        </Link>
      )}
      <Link
        to="/profile"
        className={styles.me}
        aria-label="Your profile"
        aria-current={pathname.startsWith('/profile') ? 'page' : undefined}
      >
        <Avatar size={40} initials />
      </Link>
    </header>
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
    // 'instant': html has scroll-behavior: smooth (index.css), and a new page must not scroll into place.
    window.scrollTo({ top: type === 'POP' ? (scrollPositions.get(key) ?? 0) : 0, left: 0, behavior: 'instant' })
  }, [key, type])
}

// No top bar: content starts at the top of the screen. Where you are lives on Home, between the
// services and the emergency numbers. Phones: a bottom tab bar in thumb reach. Tablets: a rail on
// the left. Desktops: a labelled sidebar. One nav element, laid out by CSS.
export default function Layout() {
  const { online } = useAppData()
  const { account, savedNotice } = useAuth()
  const staff = useStaffView(account)
  const navTabs = tabsFor(can(account, 'contribute'), staff)
  // The Review badge: the same small summary Home shows, cached (staff/snapshot.ts).
  const summary = useSummary(staff)
  const waiting = summary.data?.pendingSubmissions ?? 0
  const { pathname } = useLocation()
  const navType = useNavigationType()
  useScrollMemory()

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>

      <nav className={styles.nav} aria-label="Main">
        <p className={styles.navName}>Bulig</p>
        <div className={styles.tabs}>
          {navTabs.map((tab) => {
            const active = isActive(tab, pathname)
            const Icon = tab.icon
            const add = tab === ADD_TAB
            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                aria-label={add ? 'Add a place' : undefined}
                className={[styles.tab, active && styles.active, add && styles.add].filter(Boolean).join(' ')}
              >
                <span className={styles.tabIcon}>
                  <Icon size={add ? 28 : 22} weight={add ? 'bold' : active ? 'fill' : 'regular'} aria-hidden="true" />
                </span>
                <span>{tab.label}</span>
                {tab === REVIEW_TAB && waiting > 0 && (
                  <span className={styles.badge}>
                    {waiting > 99 ? '99+' : waiting}
                    <span className="visually-hidden"> waiting</span>
                  </span>
                )}
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
        {staff && <StaffBar pathname={pathname} />}
        <main id="main" className={pathname === '/map' ? `${styles.main} ${styles.flush}` : styles.main}>
          {/* Keyed by path: each page mounts fresh and animates in (enterClass). The tab bar stays
              outside, so it never blinks. Emergency and the Map appear at once: one is reached in a
              hurry, the other is a heavy canvas carrying its own Emergency button. */}
          <div key={pathname} className={enterClass(pathname, navType)}>
            <ReadyGate pathname={pathname}>
              <Outlet />
            </ReadyGate>
          </div>
        </main>
      </div>
      {!staff && <EmergencyButton pathname={pathname} />}
      {/* A heart the server refused flips back; this says why, then goes. */}
      {savedNotice && (
        <p className={styles.notice} role="status">
          {savedNotice}
        </p>
      )}
    </div>
  )
}
