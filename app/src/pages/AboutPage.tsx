import Mascot from '../components/Mascot.tsx'
import { SubPage } from './AccountPages.tsx'
import page from './Page.module.css'
import styles from './Profile.module.css'

export default function AboutPage() {
  return (
    <SubPage title="About Bulig" lead="Help along the way. Bulig means “help” in Waray and Hiligaynon.">
      <span className={page.aboutMascot}>
        <Mascot variant="ready" height={140} />
      </span>
      <article className={styles.doc}>
        <section>
          <h2>What Bulig does</h2>
          <p>
            Bulig is a free road companion for drivers and riders in the Philippines. In one place it shows the
            national emergency number, the local police, fire, rescue and disaster offices for where you are, and
            the nearest vulcanizing shop, gas station, mechanic, hospital, food stop, store and place to stay.
          </p>
        </section>
        <section>
          <h2>How it works</h2>
          <ul>
            <li>Your phone’s GPS finds your barangay and town, and every place is sorted by distance from you.</li>
            <li>Tap a number to call it, or a place for directions on Bulig’s map or in Google Maps.</li>
            <li>The red button on every screen opens Emergency, with 911 at the top. It works without an account.</li>
            <li>After one visit, numbers, places and your saved list work offline, with no signal.</li>
          </ul>
        </section>
        <section>
          <h2>Checked information</h2>
          <p>
            Every number and place shows when it was last checked. Emergency numbers nobody has checked in 180
            days are hidden, so you don’t call a dead line. Soon, signed-in users will be able to send updates (new
            prices, hours, a closed shop), and a moderator will check each one before it shows. Records marked SAMPLE are made up for
            testing and are being replaced area by area, starting with Guiuan and Mercedes, Eastern Samar.
          </p>
        </section>
        <section>
          <h2>What Bulig is not</h2>
          <p>
            Bulig is a directory, not an emergency service. It never dispatches anyone, never sends your location
            to anyone, and can’t promise a place is open or a number answers. You make the call. Please pull over
            safely before using your phone.
          </p>
        </section>
        <section>
          <h2>Free, no ads</h2>
          <p>
            Bulig is free to use, with no ads or paywalls anywhere near emergencies. It runs on free and
            open-source services.
          </p>
        </section>
        <section>
          <h2>Credits</h2>
          <p>
            Map data © OpenStreetMap contributors (ODbL). Map tiles by OpenFreeMap with the OpenMapTiles schema,
            drawn by MapLibre. Addresses by Nominatim and routes by OSRM on routing.openstreetmap.de (FOSSGIS).
            Built with React, Phosphor Icons and IBM Plex Sans. Thank you to everyone behind them.
          </p>
        </section>
      </article>
    </SubPage>
  )
}
