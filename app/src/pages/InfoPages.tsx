import { SubPage } from './AccountPages.tsx'
import styles from './Profile.module.css'

const UPDATED = '30 October 2026'

// Shown on Terms and Privacy until a lawyer has reviewed them. Keep until then.
function Draft() {
  return (
    <p className={styles.draft}>
      Draft for the preview build, last updated {UPDATED}. It describes how Bulig works today and still needs
      legal review before launch.
    </p>
  )
}

export function HelpPage() {
  const faqs: [string, string][] = [
    [
      'How do I call for help fast?',
      'Tap the red button on any screen. It opens Emergency, with 911 at the top and the local police, fire and rescue numbers for your area. You never need an account for it.',
    ],
    [
      'How does Bulig know where I am?',
      'Your phone’s GPS. Bulig finds the nearest listed town and sorts every place by distance. Tap the refresh button in the header for a fresh fix.',
    ],
    [
      'Does it work with no signal?',
      'Yes, after one visit. Emergency numbers, places and your saved list stay on your phone. The map needs a connection; without one, the Map tab shows a list instead.',
    ],
    [
      'What does "Last checked" mean?',
      'The date someone confirmed the number or place. Numbers nobody has checked in 180 days are hidden.',
    ],
    [
      'What are the SAMPLE places?',
      'Made-up records for testing the preview. Don’t call them. They are replaced as real places are checked.',
    ],
    [
      'What is "Others"?',
      'New stalls and local finds, like halo-halo, BBQ and coffee kiosks. Places listed in the last 60 days show a NEW badge. They are still sorted by distance.',
    ],
    [
      'Does Bulig send help or my location?',
      'No. Bulig shows numbers and places; you make the call. It never dispatches anyone and never shares your location with emergency services.',
    ],
    [
      'How do directions work?',
      'Tap Directions on a place (or Route on the map). Bulig draws the route on its own map, with the distance and time by car or on foot, from OpenStreetMap. For spoken turn-by-turn, tap Google Maps.',
    ],
    [
      'How do I install it as an app?',
      'Profile > Install Bulig. Once installed, it opens full screen from your home screen, like any other app.',
    ],
  ]
  return (
    <SubPage title="Help and FAQ">
      <div className={styles.doc}>
        {faqs.map(([q, a]) => (
          <details key={q} className={styles.faq}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </SubPage>
  )
}

export function TermsPage() {
  return (
    <SubPage title="Terms of Use">
      <article className={styles.doc}>
        <Draft />
        <section>
          <h2>1. What Bulig is</h2>
          <p>
            Bulig is a free directory of emergency numbers and road services in the Philippines. It shows
            information; it does not provide emergency services, dispatch anyone, or guarantee that a place is
            open or a number answers.
          </p>
        </section>
        <section>
          <h2>2. In an emergency</h2>
          <p>
            Call 911 or the local number shown. Bulig is a help, never a replacement for calling. Do not use your
            phone while driving; pull over first (Republic Act No. 10913).
          </p>
        </section>
        <section>
          <h2>3. Information can change</h2>
          <p>
            Every number and place shows when it was last checked. Hours and numbers change; call ahead. Records
            marked SAMPLE are made up for testing and must not be called.
          </p>
        </section>
        <section>
          <h2>4. Your account</h2>
          <p>
            Keep your password to yourself. In this preview, accounts are stored on your phone only. You can
            delete an account you created from Profile at any time.
          </p>
        </section>
        <section>
          <h2>5. Fair use</h2>
          <ul>
            <li>Don’t submit false information or pretend to be someone else.</li>
            <li>Don’t try to break, overload or copy the service.</li>
            <li>Listings for new and local businesses must be real and lawful.</li>
          </ul>
        </section>
        <section>
          <h2>6. Changes</h2>
          <p>We may update these terms. The date at the top shows the latest version.</p>
        </section>
      </article>
    </SubPage>
  )
}

export function PrivacyPage() {
  return (
    <SubPage title="Privacy Policy">
      <article className={styles.doc}>
        <Draft />
        <section>
          <h2>What stays on your phone</h2>
          <ul>
            <li>Your account (name, email, and a scrambled hash of your password, never the password itself).</li>
            <li>Your saved places, profile details, theme and last area.</li>
            <li>Your exact GPS position. Bulig uses it on the phone to find your area and sort places.</li>
          </ul>
        </section>
        <section>
          <h2>What leaves your phone</h2>
          <ul>
            <li>
              To show your barangay and town, a rounded position (about 100 m) goes to OpenStreetMap’s Nominatim,
              only when you are online and after you move or tap refresh.
            </li>
            <li>
              When you open the Map, map images load from OpenFreeMap, which sees the area being viewed, as any
              map service does.
            </li>
            <li>
              When you ask for a route, your position and the place’s go to the OpenStreetMap routing service
              run by FOSSGIS (routing.openstreetmap.de), again when you have moved about 200 m along the way.
            </li>
            <li>Google Maps opens with the place’s location, only when you tap Google Maps.</li>
          </ul>
        </section>
        <section>
          <h2>What we never do</h2>
          <ul>
            <li>No ads, no tracking, no analytics, no selling of data.</li>
            <li>We never send your location to emergency services or anyone else.</li>
          </ul>
        </section>
        <section>
          <h2>Your choices</h2>
          <p>
            Turn location off in your phone’s settings: Bulig then asks you to pick an area. Delete an account
            you created from Profile. Clearing the browser’s site data removes everything Bulig stored.
          </p>
        </section>
        <section>
          <h2>When accounts move online</h2>
          <p>
            This policy will be updated before any account data is stored on a server, in line with the Data
            Privacy Act of 2012 (Republic Act No. 10173).
          </p>
        </section>
      </article>
    </SubPage>
  )
}

export function LicensesPage() {
  const credits: [string, string, string][] = [
    ['OpenStreetMap', 'Map data © OpenStreetMap contributors', 'ODbL 1.0'],
    ['OpenMapTiles', 'Vector tile schema and style', 'BSD-3-Clause and CC-BY 4.0'],
    ['OpenFreeMap', 'Free map tile hosting', 'Free to use, no key'],
    ['MapLibre GL JS', 'Map rendering', 'BSD-3-Clause'],
    ['Nominatim', 'Address lookup from OpenStreetMap', 'ODbL 1.0 (data)'],
    ['OSRM (FOSSGIS)', 'Routes along OpenStreetMap roads', 'BSD-2-Clause'],
    ['React and React Router', 'App framework and routing', 'MIT'],
    ['Lucide', 'Icons', 'ISC'],
    ['Lexend and Source Sans 3', 'Fonts', 'SIL Open Font License 1.1'],
    ['Workbox (vite-plugin-pwa)', 'Offline support', 'MIT'],
  ]
  return (
    <SubPage title="Open-source licences" lead="Bulig is built on free and open-source work. Thank you.">
      <ul className={styles.rows}>
        {credits.map(([name, what, licence]) => (
          <li key={name} className={`${styles.row} ${styles.static}`}>
            <span className={styles.rowLabel}>
              {name}
              <br />
              <span className={styles.email}>{what}</span>
            </span>
            <span className={styles.rowValue}>{licence}</span>
          </li>
        ))}
      </ul>
    </SubPage>
  )
}
