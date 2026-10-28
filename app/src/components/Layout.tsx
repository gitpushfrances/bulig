import { Link, NavLink, Outlet } from 'react-router'
import type { ReactNode } from 'react'
import styles from './Layout.module.css'

interface Tab {
  to: string
  label: string
  icon: ReactNode
}

const iconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const tabs: Tab[] = [
  {
    to: '/',
    label: 'Emergency',
    icon: (
      <svg {...iconProps}>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
      </svg>
    ),
  },
  {
    to: '/services',
    label: 'Services',
    icon: (
      <svg {...iconProps}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />
      </svg>
    ),
  },
  {
    to: '/about',
    label: 'About',
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
]

export default function Layout() {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand} aria-label="Bulig home">
            <span className={styles.logo} aria-hidden="true">
              B
            </span>
            <span>
              <span className={styles.name}>Bulig</span>
              <span className={styles.tagline}>Help Along the Way</span>
            </span>
          </Link>
          <nav className={styles.tabbar} aria-label="Main">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end
                className={({ isActive }) =>
                  isActive ? `${styles.tab} ${styles.active}` : styles.tab
                }
              >
                {tab.icon}
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
