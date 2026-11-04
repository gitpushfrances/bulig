import { SubPage } from './AccountPages.tsx'
import styles from './Profile.module.css'

const UPDATED = '4 November 2026'

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
          <h2>1. Agreeing to these terms</h2>
          <p>
            By using Bulig (the app and the website) you agree to these terms. If you don’t agree, please don’t
            use it. If you are under 18, use Bulig with a parent’s or guardian’s permission.
          </p>
        </section>
        <section>
          <h2>2. What Bulig is</h2>
          <p>
            Bulig is a free directory of emergency numbers and road services in the Philippines: vulcanizing
            shops, gas, mechanics, hospitals, food, stores and places to stay. It shows information. It does not
            provide emergency services, does not dispatch anyone, does not send your location to anyone, and does
            not guarantee that a place is open, has stock or a service, or that a number answers.
          </p>
        </section>
        <section>
          <h2>3. In an emergency</h2>
          <ul>
            <li>Call 911 or the local number shown. Bulig helps you find the number; it never replaces the call.</li>
            <li>If a number doesn’t answer, try 911 or another number on the Emergency screen.</li>
            <li>
              Don’t use your phone while driving. Pull over safely first (Anti-Distracted Driving Act, Republic Act
              No. 10913).
            </li>
          </ul>
        </section>
        <section>
          <h2>4. Information can be wrong or out of date</h2>
          <p>
            Numbers, hours, prices and services change. Each one shows when it was last checked; prices are shown
            as “seen” on a date. Call ahead when it matters. Records marked SAMPLE are made up for testing and must
            not be called. Distances and routes come from OpenStreetMap and can differ from the road you see:
            follow road signs and traffic rules.
          </p>
        </section>
        <section>
          <h2>5. Your account</h2>
          <ul>
            <li>Emergency works without an account. Everything else needs one.</li>
            <li>Give your real name and an email you can open. Keep your password to yourself.</li>
            <li>You are responsible for what is done with your account. Tell us if someone else used it.</li>
            <li>You can edit your details or delete your account from Profile at any time.</li>
          </ul>
        </section>
        <section>
          <h2>6. Updates and photos you send (coming soon)</h2>
          <ul>
            <li>Only send what you saw yourself: real prices, hours, services and places.</li>
            <li>Photos must be of the place (a sign, a price board), taken by you, and show no one’s face or plate number.</li>
            <li>
              A moderator checks every update before it shows, and may edit or reject it. Once approved, it is
              shown to everyone with the date it was seen.
            </li>
            <li>
              You keep the rights to your photos and give Bulig a free, worldwide permission to show, resize and
              keep them as part of the place’s record.
            </li>
          </ul>
        </section>
        <section>
          <h2>7. Fair use</h2>
          <ul>
            <li>Don’t submit false information, spam, or ads, or pretend to be someone else.</li>
            <li>Don’t harass anyone or post anything unlawful, hateful or private about others.</li>
            <li>Don’t try to break, overload, scrape or copy the service.</li>
            <li>Listings for new and local businesses must be real and lawful.</li>
          </ul>
          <p>Breaking these rules can get updates removed and an account suspended or deleted.</p>
        </section>
        <section>
          <h2>8. Liability</h2>
          <p>
            Bulig is provided free and “as is”. As far as the law allows, Bulig and the people behind it are not
            liable for loss or harm that comes from relying on a number, place, price, route or time shown, from a
            place being closed, or from the app being unavailable. Nothing here limits rights you have under
            Philippine law that can’t be waived.
          </p>
        </section>
        <section>
          <h2>9. Changes and ending</h2>
          <p>
            We may update Bulig and these terms. The date at the top shows the latest version; big changes will be
            shown in the app. We may stop or change the service at any time. These terms follow the laws of the
            Philippines.
          </p>
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
          <h2>The short version</h2>
          <ul>
            <li>We keep only what Bulig needs: your account, profile and saved places.</li>
            <li>Your exact GPS position stays on your phone.</li>
            <li>No ads, no tracking, no analytics, and we never sell your data.</li>
            <li>We never send your location to emergency services or anyone else.</li>
          </ul>
          <p>
            This policy follows the Data Privacy Act of 2012 (Republic Act No. 10173) and its implementing rules.
          </p>
        </section>
        <section>
          <h2>What we collect, and why</h2>
          <ul>
            <li>
              <strong>Account:</strong> your name, email and password, to sign you in and to send account emails
              (password reset, email change). The password is stored only as a one-way hash, never as itself.
            </li>
            <li>
              <strong>Profile (optional):</strong> mobile number, home area (barangay and town, never a house
              address) and a profile photo. Shown to you; moderators and admins can see them to handle reports.
            </li>
            <li>
              <strong>Saved places:</strong> so your list follows you to any phone.
            </li>
            <li>
              <strong>Updates you send (coming soon):</strong> the details and photos, the date you saw them and your account, so
              a moderator can check them.
            </li>
            <li>
              <strong>Security records:</strong> when your email, name, phone or role changed and by whom, kept for
              one year to stop abuse. Passwords and sign-in tokens are never logged.
            </li>
          </ul>
        </section>
        <section>
          <h2>Your location</h2>
          <ul>
            <li>Your exact GPS position stays on your phone. Bulig uses it there to find your area and sort places.</li>
            <li>
              To show your barangay and town, a position rounded to about 100 m goes to OpenStreetMap’s Nominatim,
              only when you are online and after you move about 250 m.
            </li>
            <li>
              When you ask for a route, your position and the place’s go to the OpenStreetMap routing service run
              by FOSSGIS (routing.openstreetmap.de).
            </li>
            <li>The Map loads map images from OpenFreeMap, which sees the area being shown, as any map does.</li>
            <li>Google Maps opens with the place’s location only when you tap Google Maps.</li>
            <li>Turn location off in your phone’s settings at any time; Bulig then asks you to pick an area.</li>
          </ul>
        </section>
        <section>
          <h2>Where your data is kept</h2>
          <ul>
            <li>Accounts and saved places: a PostgreSQL database run by Neon, in Singapore.</li>
            <li>The Bulig server: Render, in Singapore.</li>
            <li>Profile and update photos: Cloudinary.</li>
            <li>Account emails: sent through Brevo, which sees your email address and the message.</li>
            <li>
              On your phone: your sign-in token, theme, last area and address, the last map view, and a copy of the data for offline
              use. Clearing the browser’s site data removes them.
            </li>
          </ul>
          <p>
            These providers handle data for us under their own security and privacy terms. Data is sent over
            encrypted connections (HTTPS).
          </p>
        </section>
        <section>
          <h2>How long we keep it</h2>
          <ul>
            <li>Your account, for as long as you keep it.</li>
            <li>
              When you delete your account, it is hidden at once and kept 30 days in case of abuse, then deleted
              for good with your photo and saved places.
            </li>
            <li>Security records: one year. Photos picked for an update that was never sent: one day.</li>
          </ul>
        </section>
        <section>
          <h2>Your rights</h2>
          <p>
            Under the Data Privacy Act you can ask what we hold about you, correct it, object to its use, ask for
            a copy, and have it deleted. Most of this you can do yourself: edit your details and photo on
            Profile, change your email or password there, and delete your account from the bottom of Profile.
            You can also complain to the National Privacy Commission (privacy.gov.ph).
          </p>
        </section>
        <section>
          <h2>Children</h2>
          <p>Bulig is meant for drivers and riders. Users under 18 need a parent’s or guardian’s permission.</p>
        </section>
        <section>
          <h2>Changes</h2>
          <p>
            We will update this policy when Bulig changes how it uses data. The date at the top shows the latest
            version; big changes will be shown in the app.
          </p>
        </section>
      </article>
    </SubPage>
  )
}
