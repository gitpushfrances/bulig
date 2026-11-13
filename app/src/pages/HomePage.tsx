import { Bell, CaretRight } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/context.ts'
import Avatar from '../components/Avatar.tsx'
import { HotlineCard, NumberRow, PlaceRow, SectionHead, ServiceBento } from '../components/Cards.tsx'
import DataNotice from '../components/DataNotice.tsx'
import FinishProfile from '../components/FinishProfile.tsx'
import { useFinishProfile } from '../auth/finishProfile.ts'
import LocationLine from '../components/LocationLine.tsx'
import MiniMap, { MINI_PINS } from '../components/MiniMap.tsx'
import { BentoSkeleton, RowsSkeleton } from '../components/Skeleton.tsx'
import { useMyUpdates } from '../contribute/useMyUpdates.ts'
import { useAppData, usePlaceIds } from '../data/context.ts'
import { fallbackHotline } from '../data/countries.ts'
import { countryName } from '../data/format.ts'
import { UNPLACED_TEXT, useNearby } from '../data/useNearby.ts'
import { visibleContacts } from '../rules/emergency.ts'
import styles from './Page.module.css'
import home from './HomePage.module.css'
import { useWelcome } from './welcome.ts'

// Home answers "what do I need?": who and where you are, the six common problems, then the nearest
// places on a real map, the local hotlines and what you saved. The red Emergency button floats over
// all of it (Layout), so 911 stays one tap away while the hotlines sit lower on the page.
// While Local hotlines is on screen, the floating Emergency button steps aside: it sat over "All numbers"
// (John, 2026-11-13), and that section already offers the same tap (the 911 card, All numbers → Emergency).
function useHideEmergencyButtonOver() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const root = document.documentElement
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) root.dataset.hotlinesOnScreen = ''
      else delete root.dataset.hotlinesOnScreen
    })
    io.observe(el)
    return () => {
      io.disconnect()
      delete root.dataset.hotlinesOnScreen
    }
  }, [])
  return ref
}

export default function HomePage() {
  const { country, data, area } = useAppData()
  const { account, saved, savedStatus } = useAuth()
  const { ready, loading, ranked, labels, position, areaName, unplaced } = useNearby()
  const welcome = useWelcome()
  const hotlinesRef = useHideEmergencyButtonOver()
  // Contributors and above: the bell lights up when a moderator has answered (no push; UI-UX.md).
  const updates = useMyUpdates()
  // A new account (often one tap with Google) fills in the rest later (UI-UX.md, Home).
  const finish = useFinishProfile(account)

  const contacts = data.status === 'ready' ? visibleContacts(data.emergency, area, new Date()) : []
  const national = contacts.find((c) => c.kind === 'national' && c.area === null)
  const local = contacts.filter((c) => c !== national).slice(0, 3)
  // Until data loads (or if it never does), the national number is still one tap away.
  const hotline = national ?? (ready ? null : fallbackHotline(country))

  const nearest = ranked.slice(0, 3)
  // The first few saved places, loaded by ID wherever they are.
  const savedIds = data.status === 'ready' ? saved.filter((id) => !data.emergency.some((c) => c.id === id)).slice(0, 3) : []
  usePlaceIds(savedIds)
  const savedPlaces = data.status === 'ready' ? savedIds.flatMap((id) => data.services.filter((s) => s.id === id)) : []

  // The map centres on you, else on the area picked; with neither there is no map, only the list.
  const areaCentre = data.status === 'ready' && area ? data.areas.find((a) => a.id === area) : undefined
  const centre =
    position ?? (areaCentre?.lat !== undefined && areaCentre.lng !== undefined ? { lat: areaCentre.lat, lng: areaCentre.lng } : null)
  const pinned = ranked.filter((r) => r.item.lat !== undefined && r.item.lng !== undefined).slice(0, MINI_PINS)
  // Without GPS the list is by name, so it must not claim to be nearest (UI-UX.md).
  const nearestTitle = position ? 'Nearest to you' : areaName ? `Near ${areaName}` : 'First listed'
  const firstName = account?.name.trim().split(/\s+/)[0]

  return (
    <section className={`${styles.page} ${home.page}`} aria-labelledby="home-title">
      {/* Profile lives here, not in the tab bar: the avatar on the right opens it. */}
      <header className={home.header}>
        <div className={home.who}>
          <p className={home.greeting}>{welcome.greeting}</p>
          <p className={home.hello}>{firstName ? `Hi, ${firstName}!` : 'Hi there!'}</p>
          <p className={home.message}>{welcome.message}</p>
          <LocationLine inHeader />
        </div>
        <div className={home.headActions}>
          {updates.allowed && (
            <Link
              to="/updates"
              className={home.bell}
              aria-label={updates.unread.length ? `Updates, ${updates.unread.length} new` : 'Updates'}
            >
              <Bell size={24} aria-hidden="true" />
              {updates.unread.length > 0 && (
                <span className={home.badge} aria-hidden="true">
                  {updates.unread.length > 9 ? '9+' : updates.unread.length}
                </span>
              )}
            </Link>
          )}
          <Link to="/profile" className={home.profile} aria-label="Profile">
            <Avatar size={44} initials />
          </Link>
        </div>
      </header>

      {account && finish.showOnHome && <FinishProfile account={account} onClose={finish.close} />}

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h1 id="home-title" className={home.title}>
            What do you need?
          </h1>
          <Link className={styles.more} to="/services">
            See all
            <CaretRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {ready && <ServiceBento ranked={ranked} labels={labels} />}
        {loading && <BentoSkeleton />}
      </div>

      <DataNotice />

      <div className={styles.homeGrid}>
        <div className={styles.homeColumn}>
          {(ready || loading) && (
            <div className={styles.section}>
              <SectionHead title={nearestTitle} to="/map" more="Open map" />
              {loading ? (
                <RowsSkeleton />
              ) : (
                <div className={`${styles.panel} ${home.nearest}`}>
                  {centre && pinned.length > 0 && <MiniMap centre={centre} places={pinned} />}
                  {nearest.length ? (
                    <ul className={styles.rows} aria-label="Nearest places">
                      {nearest.map(({ item, km }) => (
                        <PlaceRow key={item.id} service={item} labels={labels} km={km} />
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.panelEmpty}>{unplaced ? UNPLACED_TEXT : 'No places listed here yet.'}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.homeColumn}>
          <div className={styles.section} ref={hotlinesRef}>
            <SectionHead title="Local hotlines" to="/emergency" more="All numbers" />
            {hotline && <HotlineCard contact={hotline} countryName={countryName(country)} compact />}
            {local.length > 0 && (
              <div className={styles.panel}>
                <ul className={styles.rows} aria-label="Local emergency numbers">
                  {local.map((c) => (
                    <NumberRow key={c.id} contact={c} />
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <SectionHead title="Saved" to={account ? '/saved' : undefined} />
            {account && (loading || savedStatus === 'loading') ? (
              <RowsSkeleton count={Math.min(Math.max(saved.length, 1), 3)} />
            ) : (
              <div className={styles.panel}>
                {!account ? (
                  <div className={styles.panelEmpty}>
                    <p>Sign in to keep the places you trust one tap away.</p>
                    <Link className={styles.secondary} to="/login">
                      Sign in
                    </Link>
                  </div>
                ) : savedPlaces.length ? (
                  <ul className={styles.rows} aria-label="Saved places">
                    {savedPlaces.map((s) => (
                      <PlaceRow
                        key={s.id}
                        service={s}
                        labels={labels}
                        km={ranked.find((r) => r.item.id === s.id)?.km ?? null}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className={styles.panelEmpty}>Tap the heart on any place to keep it here.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className={styles.footnote}>Pull over safely before using your phone.</p>
    </section>
  )
}
