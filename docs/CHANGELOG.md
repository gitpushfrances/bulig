# Changelog

All notable changes to Bulig are recorded here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases follow the phase tags in the [Roadmap](ROADMAP.md) (`v0.1` to `v1.x`).

## How to write an entry

- Add every change under **Unreleased** as it happens, not at the end of the phase.
- Put each entry under one of these headings:
  - **Added**, **Changed**, **Removed**, **Fixed**, **Security**: the usual kinds of change.
  - **Errors**: something broke (build, CI, deploy, data). Say what failed, the error message, the cause, and the fix. If it isn't fixed yet, mark it **open**.
  - **Conflicts**: merge conflicts, or the code disagreeing with the Roadmap or Architecture. Say which side won and why.
  - **Big changes**: anything that changes the data contract, a route, the stack, hosting or a phase plan. Link the doc you updated.
- Mention the Jira ticket (`SCRUM-xx`) and the PR or commit when there is one.
- At the end of a phase, tag the release, rename **Unreleased** to the version and date, and start a new empty **Unreleased**. The Roadmap asks for a 3-line summary at the top of each release.

---

## [Unreleased]

Phase 3: First pilot (target `v0.3`). Bulig covers the whole Philippines; the pilot areas are only where verified data starts.

### Fixed

- **Lighthouse fixes** (SCRUM-28, 2026-10-30): Emergency's guest note no longer pushes content while the numbers load (layout shift 0.195 → 0.071, Performance 85 → 93); the Call 911 button's accessible name starts with its visible words ("Call 911, National Emergency Hotline", WCAG 2.5.3); Ropi's head no longer squashes in its circle; `public/robots.txt` added (SEO 91 → 100). Scores now (mobile): Login 95 / 100 / 93 / 100, Emergency 93 / 100 / 96 / 100 (Performance / Accessibility / Best Practices / SEO). The remaining Best Practices note is the location request on open, which UI-UX.md asks for.

### Added

- **API contract, [docs/API.md](API.md)** (2026-10-30): every request the frontend makes, or will once the backend exists, with method and path, auth, request payload, response, errors, and where it lives in the frontend today. 19 requests: public reads (areas, emergency contacts, services, labels), auth (register, login, logout, forgot and reset password), `/me` (profile, photo, password, delete), saved places and reports. Also the free services the app calls directly (Nominatim, OpenFreeMap, OSRM, Google Maps) and a table of what moves from `localStorage` to the server. ARCHITECTURE (identity, Phase 4), WORKFLOW, ROADMAP, README and CLAUDE.md point to it; CLAUDE.md asks that any new frontend request is added in the same PR.
- **Opening hours, features, filters and Place details** (branch `feat/hours-features-place`, 2026-10-30; SCRUM-29 and the hours/features ticket):
  - **Contract:** optional `Service.features`, `Service.weeklyHours` and `Service.open24h`, validated. The 77 sample places are converted from their hours text (24-hour places, daily hours, "closed Sunday"); "Check-in until 10pm" and missing hours stay unknown. Features are added per category (air pump, tubeless, comes to you, motorcycle, car or truck, bottled fuel, emergency room), some confirmed, some not.
  - **Rules:** `rules/hours.ts` (usually open now, until when, opens next, overnight hours, the week's wording, always "usually") and `rankForNeed()` (chips, ER first for hospitals, nearest usually open), with tests.
  - **Nearby results:** filter chips per need, the status line, feature tags, "Nearest usually open at this time" under a closed nearest place, "Clear filters", and rows that open Place details.
  - **Place details** (`/place/:id`): status, Call / Route / Share, the week's hours with Today, what it offers, last checked and source, Open in Google Maps. Linked from Nearby, Saved and the Map's place sheet (**Details**).
  - Tests: 141.
- **Route sheet you can't lose by accident** (branch `feat/route-minimize`, 2026-10-30): the route sheet's × becomes **Minimize** (a slim pill with the place, distance and time; the line stays on the map; tap to reopen). **End route** is a button at the bottom of the sheet, or swipe the pill away; then "Route ended · Undo" for 5 seconds. Another pin's **Route here instead** replaces the route. The route survives leaving the Map (`sessionStorage`). `src/map/RouteSheet.tsx`, with tests (124 in total).
- **Walking Ropi while loading** (branch `claude/project-thread-a5fkrh`): `RopiLoader.tsx` plays `ropi-walk.webp`, an 8-frame walk cycle cut from John's Canva video (1.2 MB MP4 → 80 KB WebP strip, background removed), above "Loading…" on Services, a category and Saved. It shows only after 400ms and stays still under reduced motion. Home and Emergency keep the plain "Loading…" line. Tests: walking on `/services`, never on `/` or `/emergency`.
- **Ropi, the mascot** (PR #16): a golden-tan dog in a helmet, goggles, teal scarf and backpack, in four poses (`ready`, `friendly`, `thinking`, `head`). [UI-UX.md § Mascot: Ropi](UI-UX.md#mascot-ropi) says where Ropi goes (Saved empty state, no results, offline with nothing cached, welcome tip, Profile/About) and where never (Home, Hotlines, Call 911, the "What's wrong?" grid, results, place details, the Map, card taps). The images live in `app/public/assets/mascot/` as transparent 480px WebP files of about 30–40 KB each; that folder's README has the names and export rules. Ropi stands still and reacts only when tapped (a short wiggle plus floating icons drawn in code), with no movement under `prefers-reduced-motion`.
- **"What's wrong?" and Nearby results** (branch `feat/whats-wrong-nearby`, 2026-10-30):
  - Home's bento tiles are now the problems: **Flat tire**, **Breakdown**, **Out of gas**, **Hospital**, **Food**, **Hotel**, **Store**, **Others**, each over the kind of place ("Vulcanizing", "Mechanic"…), opening `/nearby/<need>`. Needs are data in `src/rules/needs.ts`, with tests.
  - **Nearby results** (`NearbyPage.tsx`) replaces the category list for both `/nearby/<need>` and `/services/<category>` (old links keep working): the nearest place as a big card (distance, name, type, usual hours, last checked, 52px **Call** and **Route**), then **More nearby** rows (tap for the route, call button), a **Map** button filtered to that kind (`/map?cat=`), and for hospitals "Call hospital" plus a "Life-threatening? Call 911 now." link to Emergency. Services cards open the same page; the Services tab stays selected on it.
  - Not built yet: the filter chips and open/closed status (need `Service.features` and `weeklyHours` data) and the nearest card's mini map.
  - Tests: 120.
- **Docs brought up to date** (same branch): README (what Bulig does now, status, test logins, the free map/address/route services, the `app/src` layout, `npx vitest run`), ROADMAP (Phase 3 marked with what is built and what is left) and ARCHITECTURE (Phase 3 table describes how each part is built today). The pilot is named "the Philippines" instead of two towns.
- **Routes in the app, the location line, no header, photo avatar** (branch `feat/route-location-avatar`, 2026-10-30). Decided by John:
  - **In-app routes:** Route on a map pin, or Directions on any place card (`/map?to=<id>`), draws the road route from where you are as a blue line, with distance and time, a Car / Walk switch, rerouting after about 200 m, **Google Maps** for voice turn-by-turn, and Call. Routes come from OSRM on OpenStreetMap roads (`src/map/route.ts`, FOSSGIS servers at `routing.openstreetmap.de`): free, no key. Privacy, Help and Licences say so.
  - **Location line on Home:** "Near you" and the header line are gone. Between the bento and the 911 card, one plain text line between hairlines: "Lahug · Cebu City · Cebu · 6000", "Updated 2:41 PM", and a reload button. The area picker sits there when GPS is off. Emergency shows the same line. `LocationBar` becomes `LocationLine`.
  - **No top bar, no "B" tile:** content starts at the top. The desktop sidebar keeps the word "Bulig" only. Offline is a slim strip at the top.
  - **Profile photo:** Edit profile can add, change or remove a photo (centre-cropped to a 256px WebP on the phone). The **Profile tab** shows it, or Ropi's head by default; the Profile header too (`Avatar`).
  - Built on PR #21 (walking Ropi), so both merge cleanly. Tests: 114.
- **Accounts, onboarding, Map and Others** (branch `feat/app-shell-map-onboarding`, 2026-10-30). Decided by John:
  - **Login** (`/login`): no header, no test shortcuts, no emergency button. Ropi's head as the mark on phones; a split screen with Ropi waving from 60rem. **Forgot password?** and **Create an account** under Sign in; **Continue without an account** (Emergency only) at the bottom. The test logins still work when typed.
  - **Sign up = onboarding** (`/signup`): Ropi explains Bulig in four steps (what it is, everyday use, why Bulig, safety) with progress dots, Back/Next and Skip intro, then the account form with a required Terms and Privacy box.
  - **Forgot password** (`/forgot-password`): the production flow as a preview; it never says whether an email has an account.
  - **Accounts and access:** everything except Emergency needs an account (`RequireAccount`). Guests see a gate with Ropi; others are sent to the login and returned after. Emergency stays open to everyone.
  - **Emergency is no longer a tab:** a red hazard button floats on every screen and opens it; Emergency has Back to the previous screen. Tabs: Home, Services, **Map**, Saved, Profile.
  - **Map** (`/map`): MapLibre GL JS with OpenFreeMap tiles (free, no key, no account), recoloured to Graphite light/dark in `src/map/mapTheme.ts`. Category pins, chips, your location dot, a place sheet with Call and Directions, the emergency and locate buttons. MapLibre loads only on this tab and stays out of the offline cache; offline or without WebGL it shows a list.
  - **Others:** a new category for new stalls and local businesses (halo-halo, BBQ, fishball, coffee, buko, lechon manok, merienda, pancit; 8 SAMPLE places). A wide tile on Home's bento, a card on Services, a NEW badge for 60 days after listing. It never changes the order.
  - **Ropi talks:** `RopiSays` (Ropi under a speech bubble) on the onboarding, forgot password, guest gate, Saved ("Let's get started!"), empty category, offline and the map's offline list.
  - **Profile, production-style:** avatar, role badge, member since; Edit profile (name, mobile, home area), Change password (accounts made on the phone), Appearance (System/Light/Dark, applied before first paint), Language, Location permission, Install Bulig, offline data, Help and FAQ, About, Terms, Privacy, open-source licences, Sign out, Delete account (type "delete"), and "Bulig v0.3.0 · build <commit>".
  - **Full screen:** installing opens Bulig without the address bar; manifest `id`/`scope`, Apple and Android web-app meta tags, and an install row in Profile (Android prompt, iPhone steps).
  - Tests: 103, covering the login, guests, onboarding, profile, theme, delete account, the emergency button and Back.
- **Cleaner login** (PR #19, branch `feat/login-polish`): Welcome drops the red "Emergency? Call 911" link; **Skip for now** moves to the top right as a quiet text button and replaces "Continue without an account". Ropi is 120px and the lead is one line, so the whole screen fits a 390 × 844 phone without scrolling. The test-login chips move from a grey box above the form to a quiet row under it, after a divider. UI-UX.md gains a "Where the app is now" table at the top for new conversations.
- **Welcome, test logins and Create account** (PR #18, branch `feat/ropi-images`): a `/welcome` screen with Ropi `ready`, a red "Emergency? Call 911" link, a Sign in / Create account tab card and "Continue without an account". It opens once per phone, only from `/` (never from a shared link), and is marked seen in `bulig.welcomed`. Test logins for every role, all with `password`: `test@bulig.com` (user), `moderator@bulig.com` (moderator, Cebu City), `admin@bulig.com` (admin). Create account makes a user kept on this phone (`src/auth/localAccounts.ts`) with a salted SHA-256 hash, never the password. The same card (`src/components/AuthPanel.tsx`) replaces Profile's old sign-in form. Labels now use `htmlFor`, so a field's name stays "Password" when its hint or error shows. Tests for each role, sign-up, validation, a taken email and the Welcome redirect (97 in total). [UI-UX.md § Welcome](UI-UX.md#welcome-welcome), [WORKFLOW.md § Sign-in](WORKFLOW.md#sign-in).
- **Ropi in the app** (branch `feat/ropi-images`): the four poses as trimmed, transparent 480px WebP files (29–36 KB each, precached for offline), replacing the 1 MB PNGs first committed. `src/components/Mascot.tsx` takes a `variant` (`ready | friendly | thinking | head`) and a height, renders a decorative `<img alt="">` hidden from screen readers, and on tap plays one 480ms hop (a nod for the head) with floating Lucide icons for 600ms: hearts for friendly and head, a "?" and a lightbulb for thinking, sparkles for ready. Taps mid-reaction are ignored; with reduced motion the icons show in place without moving. Ropi appears on the Saved empty state (`friendly`, "Tap the heart on any place to save it here."), an empty category (`thinking`), offline with nothing cached on Services, a category or Saved (`thinking`, "No signal, and nothing saved here yet." plus Try again), About (`ready`) and the signed-in Profile (`head`, in a circle). `DataNotice` only shows Ropi when a page opts in with `ropi`, so Home and Emergency never do. Tests in `Mascot.test.tsx` cover the reaction and every screen Ropi may and may not appear on (88 tests in total).
- **Near you, with a real address** (branch `feat/address-near-you`): the location control reads "Near you" over the barangay and town, and Home has a **Your location** card with barangay, city or municipality, province and ZIP code and when it was updated. The address comes from OpenStreetMap Nominatim's reverse lookup (`src/location/address.ts`, with tests), cached on the phone, looked up again only after a 250 m move or a refresh. Missing parts are filled from the nearest listed area. The address words come from a new optional `address` block in `labels.json` (PH: Barangay, City or municipality, Province, ZIP code).
- **Home, What we offer and GPS** (branch `feat/home-gps-offers`):
  - **Home** (`/`): the national hotline with Call 911, local numbers, the nearest places, What we offer cards and Saved, each linking to its tab.
  - **What we offer** (`/services`): one card per kind of service with its count and nearest distance; a card opens `/services/<category>`, nearest first. The category chips and search are gone.
  - **Emergency** moves to `/emergency`.
  - **Location from GPS:** `LocationProvider` follows the phone (`watchPosition`) and a refresh button asks for a fresh fix; the nearest listed area is used automatically. A plain area picker shows only when GPS is off. `nearestArea()`, `byDistance()` and `formatDistance()` in `src/rules/nearby.ts`, with tests.
  - **Hotels:** a new `lodging` category ("Hotel and inn"), and `Area.lat/lng` filled in for every area.
  - **Responsive layout:** bottom bar on phones, an 88px rail on tablets, a 240px sidebar on desktops; two-column Home and lists on wide screens. Tabs fade in over 200ms; scrollbars are hidden.
  - Sample data now has every kind of service in every area (69 places), except hotels in one area so the empty state can be tested.
- **Ocean Depths theme** (branch `feat/ocean-theme-demo-login`, PR #11): deep sea blue, teal and one bright aqua for Call 911, in light and dark. Tokens in three layers (primitive, semantic, component) in `src/index.css`. Documented in [UI-UX.md section 10](UI-UX.md#10-visual-design-ocean-depths--modern-utility-minimalism).
- **Cleaner UI:** a light header, a 4-tab bar (Emergency, Services, Saved, Profile) with a neutral active pill, a hotline card with the national number at display size and the country name from `Intl.DisplayNames`, cards with one Lucide icon per category and contact kind, an area picker grouped by province, category chips with icons, a results count, and an empty state with "Clear search and category".
- **Fonts and icons:** Lexend and Source Sans 3 self-hosted through Fontsource (Latin files precached, so they work offline), and `lucide-react` icons.
- **Test sign-in and saving:** `/profile` signs in with one hardcoded test login, `test@bulig.com` / `password` (role user). Signed in, the heart on any place or local number saves it, and `/saved` lists them. Signed out, the heart links to Profile and comes back afterwards. The session and saved IDs live in `localStorage` on the phone.
- **Roles in the system:** user, moderator (per area: city, municipality, later barangay, covering the areas inside it) and admin, with `can()` and `isWithin()` in `src/rules/permissions.ts` and tests. No role screens yet. Described in the new [WORKFLOW.md](WORKFLOW.md) with the record, sign-in and code-change flows.
- **More sample data across the Philippines:** 10 areas (Quezon City, Baguio, Naga, Puerto Princesa, Iloilo City, Cebu City, Tacloban, Guiuan, Mercedes, Davao City), 15 local numbers (one expired on purpose) and 22 places in every category. All still SAMPLE with `000` phone blocks.
- Tests for sign-in, sign-out, saving, the sign-in redirect, permissions and the area hierarchy (57 in total).

### Changed

- **No Google Form for Report wrong info** (John, 2026-10-30): reports go straight into the app with the backend (Phase 4, `POST /submissions`, SCRUM-30). ARCHITECTURE (Spine 3, Phases 3 and 5), API.md, ROADMAP (Phase 3 tickets, weekly loop, "done when") and UI-UX (flow, Place details) updated. Cloudflare Web Analytics waits for John's token (SCRUM-31).
- **Graphite theme replaces Ocean Depths** (branch `feat/ropi-images`): a minimal light theme of near-black, zinc greys and white, with dark mode. Colour now only means something: red for Call 911 and emergency actions (`--color-emergency`), green for checked. Normal Call and primary buttons are near-black (white in dark mode). The national hotline is a near-black card with a red Call 911 button. Inputs and chips get a 3:1 control border (`--color-border-strong`). Cards 14px, controls 10px. `theme-color`, the manifest colours, `favicon.svg` and the regenerated app icons follow. Tokens and measured contrast in [UI-UX.md § Theme: Graphite](UI-UX.md#theme-graphite-current-2026-10-29). Decided by John on 2026-10-29.
- The service worker now precaches `.webp` files too (`app/vite.config.ts`, `globPatterns`), so Ropi shows offline after the first visit.
- **Home, simpler** (branch `feat/home-bento`): the location is a single plain line in the header, "Near you · <barangay>, <town>", one text size, no box. The "Your location" card is gone. In its place Home opens with **What do you need?** and a bento grid of the seven services: Vulcanizing as the large tile with its nearest shop, the rest as small tiles with count and nearest distance (2 columns on phones, 4 from tablets, flush rows at both). The duplicate What we offer block on Home is removed, along with the card-only code (`AddressCard`, `timeAgo`, `addressLabel` and the `address` labels block).
- Being offline shows once, as a pill in the header, instead of in each page's notices.
- The About page no longer names a first stop; it describes Bulig for anywhere. UI-UX.md wireframes use `<town>` instead of pilot town names.
- PWA `theme_color`, `background_color`, the `theme-color` meta tags, and the favicon and app icons use the new colours.
- Mobile fixes from the mobile-native skill: no tap flash, no pull-to-refresh fight, hover only on devices that hover, 16px inputs, buttons don't select on long-press.

### Big changes

- **Login required for everything but Emergency** (2026-10-30, John). Shared links to `/services/...` now ask non-members to sign in; `/emergency` links never do. CLAUDE.md's hard rules are updated to match.
- **Contract:** category `other` and `Service.addedAt` (optional), version stays 1. See [ARCHITECTURE.md § Contract change log](ARCHITECTURE.md#contract-change-log).
- **Routes:** `/login`, `/signup`, `/forgot-password`, `/map`, `/profile/edit`, `/profile/password`, `/help`, `/terms`, `/privacy`, `/licenses` are new. `/welcome` redirects to `/login`. `/emergency` is no longer a tab.
- **New UI and UX spec, [docs/UI-UX.md](UI-UX.md).** The app is now built around "What's wrong?": four tabs (Home, Map, Saved, Profile) replace Emergency, Services and About. Home has a hotlines card (911 one tap, plus MDRRMO, PNP, BFP), six problem buttons (Flat tire, Out of gas, Breakdown, Hospital, Food, Store) and a mini map. Each button opens a Nearby results screen with the nearest place as a big card (Call, Directions) and the rest as a list. `/services` and `/about` keep working. Decided by John on 2026-10-29 after reviewing the Figma Make prototype. Saved and Profile are built; Home and Map are next.
- **Roadmap and Architecture updated** for the new screens in Phase 3: needs, location, ranking (`rankNearby()`, `isUsuallyOpen()`), Home, Map, Saved and Profile. The Phase 7 "roadside help" feature now ships on the phone in Phase 3; Phase 7 only moves the ranking to the server.
- **Contract v1 gets optional fields** for Phase 3: `Area.lat/lng`, `Area.level`, `Area.parent`, `Service.features`, `Service.weeklyHours`, `Service.open24h`, `Service.subtype`. `level` and `parent` are already validated and in the data, so barangays can be added later as data.
- **Routes:** `/saved` and `/profile` are new. `/about` stays, under the Profile tab.

### Conflicts

- **A looping Ropi against "moves only when tapped".** UI-UX.md said Ropi stands still unless tapped. The loading walk loops, so it is written in as the one exception: it only runs during a real wait, after 400ms, never on Home or Emergency, and not at all under reduced motion.
- **Hotline card: Graphite against the pale-red spec.** UI-UX.md's component rules asked for a pale-red hotline card. With Graphite, the hotline is a near-black card with a red Call 911 button: it stays the strongest block on Home, and red is kept for the button alone. UI-UX.md § Theme: Graphite records the change.
- **Welcome before Home against "nothing before 911".** A first open of `/` now shows Welcome. Kept because it shows once per phone, shared links (including `/emergency`) never redirect, and **Skip for now** is one tap to Home, where 911 comes first. Welcome first carried its own red Call 911 link; John removed it on 2026-10-29 because it cluttered the login (PR #19).

- **Mascot against the minimal style.** Section 10 said empty states need no illustration and banned decorative or continuous animation. John asked for a mascot that reacts to touch. Both are kept: Ropi is the only illustration allowed, only on the quiet screens, and moves only for under 600ms after a tap. No idle bobbing, and never near the emergency path.
- **A rounded location now leaves the phone.** The spec and app said the position never leaves the phone. Showing the barangay and ZIP code needs an address lookup, which John asked for, so a position rounded to about 110 m goes to OpenStreetMap, only online and only after a 250 m move or a refresh. The exact position still stays on the phone. Profile, UI-UX.md and ARCHITECTURE.md now say this.
- **Location is asked for on open.** UI-UX.md said to ask only on first use of a need button or the Map. John asked for the area to come from GPS by itself and follow the driver, so the app now asks on open and keeps watching while it is open. UI-UX.md section 6 and ARCHITECTURE.md are updated.
- **`/` is now Home, not Emergency.** v0.2 links to `/` still land one tap from 911 (the hotline card is the first thing on Home). Emergency Help moved to `/emergency`.
- The Figma Make prototype ("Design-Ropa-Roadside-Assistance") had login, ratings, an owner portal and an admin dashboard, and was still named Ropa. Those were left out of the spec: login and the portals belong to Phases 4 and 5, and ratings wait for John's decision (Phase 5 at the earliest). It also had no 911 button. The spec keeps 911 one tap from Home.
- **Sign-in arrives before Phase 4.** The spec said Profile has no sign-in, ARCHITECTURE.md said no user accounts until Phase 4, and Roadmap ground rule 5 says one phase at a time. John then asked for a test sign-in, saving behind it and the three roles, so the newer request won. It's kept small on purpose: one test login, role rules as pure functions, no backend. UI-UX.md and [ARCHITECTURE.md](ARCHITECTURE.md#4-identity) are updated.
- **Theme and fonts.** The spec said one green brand colour and system fonts only. John asked for the Ocean Depths theme and for the design skills to be followed, so the spec now uses Ocean Depths and two self-hosted fonts. They add about 130 KB to the first visit and are precached, so offline still works.
- **Merge with PR #10.** This branch started before PR #10 added UI-UX.md. Both added a UI-UX.md; the PR #10 spec was kept as the base and the Ocean Depths design became its section 10. Both added a Phase 3 row to the contract change log; they are now one row.

### Security

- The address lookup sends a rounded position (about 110 m) to `nominatim.openstreetmap.org` with the browser's normal referrer; no account, cookie or device ID. Nominatim allows light use only, so the app looks up at most once per 250 m moved or per refresh.
- The test login ships in the app's JavaScript and protects nothing. It only exists so testers can try saving. Remove `src/auth/testAccount.ts` when Phase 4 sign-in lands, and never put a real password in the app.

---

## [v0.2] - 2026-10-29

Phase 2: Emergency + Services PWA. Tickets SCRUM-24 to SCRUM-27.

- Emergency shows the national number first (never hidden) and hides numbers not checked in 180 days.
- Services finds a tire shop in 2 taps, with Call and Directions, using per-country labels.
- Installable PWA that works offline after one visit; all local records are SAMPLE until Phase 3.

### Added

- **SCRUM-24 data** (branch `feat/phase-2-offline-pwa`):
  - Contract v1 lives in `src/types.ts`: `Area`, `EmergencyContact`, `Service`, `Category`, `Envelope` and `Labels`.
  - Philippine data is in `public/data/ph/`: 2 areas, the real 911 line, 4 sample local numbers (one expired on purpose), 5 sample places, and `labels.json` (`tire_repair` → "Vulcanizing").
  - `validateEnvelope()` checks every file in CI and at runtime.
  - `DataProvider` and `useAppData()` load one country for the whole app and remember the picked area.
- **SCRUM-25 Emergency page:**
  - `visibleContacts()` puts the national number first, never hides it, and hides other numbers last checked more than 180 days ago (boundary tested).
  - Each number is a 48px `tel:` button with a "Last checked" date.
  - The built-in fallback `tel:911` shows while data is loading or if it fails to load.
- **SCRUM-26 Services page:** an area picker, category chips (only categories that exist in the picked area), search by name or landmark, Call and Directions (a Google Maps link) buttons, and `filterServices()`. A tire shop takes 2 taps: Vulcanizing, then Call.
- **SCRUM-27 offline:**
  - `vite-plugin-pwa` 2.0 adds a manifest, icons generated from `favicon.svg` (`pwa-assets.config.ts`), and a service worker.
  - An "Offline, showing saved data" note shows when there's no connection.
  - Checked in headless Edge with a mobile viewport: after one visit, an offline reload shows 911 first, both tire shops, and `/about` as a deep link, with no console errors.
- Sample records get a grey SAMPLE badge and a "Sample data, don't call them" note. Sample phone numbers use `000` blocks so they aren't real lines.

### Big changes

- **These differ from ARCHITECTURE.md (the doc is updated to match):**
  - Data files are **precached** instead of `NetworkFirst`, so offline works from the first visit. They are static files that only change on a deploy, and a deploy ships a new service worker. `NetworkFirst` comes back with the API in Phase 4.
  - The list of live countries is `LIVE_COUNTRIES` in `src/data/countries.ts`, not a `countries.json` file. One fewer request.
  - JSON Schema files and `ajv` are left out for now. The TypeScript `validateEnvelope()` covers Phase 2, and the schema files come when Phase 4 needs to share them with Laravel.
  - There's no country picker while only PH is live.
- **Note:** sample local numbers were last checked 2026-10-20, so the app will hide them after 2027-04-18. Phase 3 replaces them with real, verified data before then.

---

## [v0.1] - 2026-10-29

Phase 1: Setup and skeleton. Tickets SCRUM-21, SCRUM-22, SCRUM-23.

- A live Cloudflare Worker link with three tabs (Emergency, Services, About), deployed automatically from `main`.
- CI (lint, tests, build) is required on `main` and proven to block a type error (PR #6).
- Scope is now global: Guiuan and Mercedes are the first pilot area, and the data contract has a country and an area on every record.

### Added

- Root `README.md` with the project summary, stack, repo layout, getting started, deploy settings and working rules. (branch `docs/readme-changelog`)
- `docs/CHANGELOG.md` (this file), as asked for by Roadmap ground rule 5. (branch `docs/readme-changelog`)
- **SCRUM-23 app shell** (branch `feat/phase-1-skeleton`):
  - Routes `/` (Emergency), `/services` and `/about` inside `<Layout>`, plus a "Page not found" route for anything else.
  - Responsive, mobile-first layout in CSS Modules. Phones get a bottom tab bar in thumb reach with 64px touch targets. Short landscape phones get a slimmer bar. From 48rem (tablets and desktops) the tabs move into the top header. Content is capped at 48rem wide. Safe-area insets are handled for notched phones, the tagline is hidden below 22rem (320px phones), and there's a light and dark theme, a skip link, visible focus rings and reduced-motion support.
  - Placeholder text on each page, with a "Coming in v0.2" badge.
  - `public/_redirects` with `/* /index.html 200`, so refreshing any route works on Cloudflare Pages.
  - New Bulig favicon, `theme-color`, page title and description in `index.html`.
- Vitest 5 + jsdom + Testing Library. `src/App.test.tsx` checks each route shows its page and marks its tab active, the three tabs stay in order, and unknown paths show "Page not found". Scripts: `npm test`, `npm run test:watch`.
- `.github/workflows/ci.yml`: `npm ci`, `npm run lint`, `npx vitest run`, `npm run build` in `app/`, on every PR and on pushes to `main` (Roadmap step 5).
- Root `.gitignore` (Roadmap step 3), also ignoring `.env` files.

### Changed

- `app/README.md` replaced: the Vite template text is now app-specific scripts and folder layout.
- Placeholder copy on Emergency, Services and About, plus the `index.html` description, no longer names only Guiuan and Mercedes. Emergency says "your country's main emergency number (like 911 or 112)"; Services says "tire repair" and "area" instead of "vulcanizing" and "town". (branch `docs/global-scope`)
- Ground rule 3 now says "test on a real phone (low-cost Android with Chrome)" and explains why a resized desktop browser isn't enough. (branch `docs/global-scope`)

### Removed

- Vite demo content: counter, logos, `App.css`, `src/assets/*` and `public/icons.svg` (Roadmap step 7).

### Errors

- **Open:** `docs/ROADMAP.md` Phase 1 step 1 said to follow `local-setup.md`, but that file isn't in the repo. The step now points to the README "Getting started" until it's written.
- **Fixed (testing only, not an app bug):** the first headless Edge screenshots at 320px and 390px looked cut off on the right. Cause: headless Edge won't use a viewport narrower than 496px and crops the image. Fix: checked with `playwright-core` and real mobile emulation instead. At 320, 390, landscape 844x390, tablet 820 and desktop 1440, `scrollWidth` equals the viewport width, so there's no sideways scrolling.
- **Fixed:** the GitHub CLI (`gh`) wasn't installed, and the GitHub plugin failed to connect ("Authorization header is badly formatted"). Installed `gh` 2.103.3 with winget and logged in as `gitpushfrances`. PRs opened: #2 (docs) and #3 (Phase 1, stacked on #2).
- **Fixed:** the first CI run on #3 passed but warned that `actions/checkout@v4` and `actions/setup-node@v4` run on Node.js 20, which GitHub has deprecated. Bumped both to `@v7` (Node 24).
- **Fixed:** the Cloudflare "Workers Builds: bulig" deploy failed. The build passed, but `npx wrangler deploy` was rejected with "Invalid _redirects configuration: Line 1: Infinite loop detected in this rule [code: 100324]". Cause: `public/_redirects` (`/* /index.html 200`) was written for Cloudflare Pages, and Workers static assets treat that rule as an infinite loop. Fix: deleted `public/_redirects`. `wrangler.jsonc`'s `not_found_handling: "single-page-application"` already does the same job. Dashboard settings were confirmed: root `app`, build `npm run build`, deploy `npx wrangler deploy`. The runtime Variables, Bindings and Observability sections are greyed out because this Worker only serves static assets, which is expected.
- **Fixed:** branch (preview) builds for PR #4 failed with "Your Wrangler configuration is missing a `previews` block". Cloudflare runs `npx wrangler preview` for non-production branches, and that command needs a `previews` block in the config, even an empty one. Added `"previews": {}` to `app/wrangler.jsonc`. The same log showed no install or build step running before the preview command, so if branch builds still fail on a missing `dist/`, check the non-production branch build settings in the dashboard.
- **Note:** the failing build log showed `wrangler` being installed on the fly and auto-generating its own `wrangler.jsonc`, which means that build ran on `main`, where this PR's config isn't merged yet. `main` keeps failing to deploy until PR #4 is merged.
- **Open (dev machine, not an app bug):** the `security-guidance` Claude Code plugin hook failed on every prompt and edit in `app/` (20 times in 9 days) with "no working Python 3 interpreter found". `Python312` is on PATH but that folder has no `python.exe`, so `python` falls through to the Microsoft Store stub. Fix: install Python from python.org or with `winget install -e --id Python.Python.3.13`. Until then, the plugin's security checks don't run.
- **Note (dev machine):** the Claude Code plugins are enabled in `app/.claude/settings.json` (git-excluded), so they only load when Claude is started from `app/`, not from the repo root. Re-enable them at the root with `/plugin` if they're wanted there.

### Big changes

- **Deploy target changed from Cloudflare Pages to a Cloudflare Worker with static assets** (branch `chore/cloudflare-deploy`). When the repo was connected, Cloudflare created a Worker. Its settings page only has build command and root directory, with no "Build output directory" field. Added `app/wrangler.jsonc`:
  - It serves `./dist`, with `not_found_handling: "single-page-application"` for refresh-safe routes. This replaces the job `public/_redirects` did on Pages, so that file was removed (see **Errors**).
  - Added `wrangler` 4.154 as a dev dependency. `npx wrangler deploy --dry-run` reads all 6 build files.
  - Still free. README "Deploy" section updated. ROADMAP, ARCHITECTURE and the README "Stack" list were updated to "Worker with static assets" and `*.workers.dev` on branch `docs/global-scope`; the behaviour is the same, including preview URLs per branch.
  - PR #4 merged 2026-10-28. CI and "Workers Builds: bulig" are both green on `main` (`de57088`).
- **Scope changed from two towns to global** (2026-10-29, branch `docs/global-scope`). Bulig is for travellers in any country. Guiuan and Mercedes stay as the **first pilot area**, not the only one. Updated [ROADMAP.md](ROADMAP.md) and [ARCHITECTURE.md](ARCHITECTURE.md):
  - Data contract (not built yet, so nothing breaks): every record has `country` (ISO 3166-1 code) and `area` (a slug, or `null` for nationwide lines). `TownId` is gone, and a new `Area` type and `areas.json` replace it. Categories have global keys (`tire_repair`, `fuel`, `food`, ...) with local labels from `labels.json` (`tire_repair` shows as "Vulcanizing" in the Philippines).
  - Data is split per country: `public/data/<cc>/...`. The `DataSource` methods take a `country`, and the API takes `?country=&area=`.
  - The national emergency number is data (`kind: 'national'`, `area: null`), never "911" in code. New ground rule 4: nothing country-specific is hard-coded.
  - Languages: English plus each area's languages through one `t(key)` lookup. Privacy: a notice per country (RA 10173 for the Philippines first, GDPR before any EU area).
  - Phase 3 is renamed "First pilot", and it adds a ticket for `docs/OPEN-AN-AREA.md`, the checklist for opening the next area. Phase 7 is renamed "More areas and countries".
- **Required CI check on `main`:** after #2 and #3 were merged, `app` was added as a required status check, with "branch must be up to date" on. The first API call (`PATCH .../required_status_checks`) returned 404 "Required status checks not enabled". A full `PUT .../protection` worked.
- **Branch protection on `main`** (2026-10-28):
  - Changes must come through a pull request, with 0 approvals required because this is a solo repo.
  - Force pushes and branch deletion are blocked, and open conversations must be resolved before merging.
  - Admins are not forced through these rules, so you can't get locked out.
  - The required `app` CI check is **not on yet**, because #2 has no CI file and would never pass it. Add it once #2 and #3 are merged.
- PR #3 now targets `main` directly instead of being stacked on #2.
- **CI proven to block bad code** (2026-10-29, Phase 1 "Done when"): draft PR #6 added `const shouldFail: number = 'this is not a number'`. The `app` check failed at `npm run build` with `TS2322: Type 'string' is not assignable to type 'number'`, the Cloudflare build failed too, and GitHub showed the merge as `BLOCKED`. Closed without merging and the branch was deleted.

### Conflicts

- Claude Code's auto-mode classifier blocked Claude from merging #2 ("Merge Without Review"). PRs are merged by John on GitHub, or Claude merges them only after an explicit permission rule.

### Carried over from Phase 1

- Test on a real phone (ground rule 3), then check the "Done when" list and move SCRUM-21, 22 and 23 to Done.
- Tagged `v0.1` without the real-phone check (John's call, 2026-10-29). Do it before closing the first Phase 2 UI ticket.

---

## 2026-10-28: Docs and line endings

Commit `b0fe06f`, merged in PR #1 (`c8ffdfd`).

### Added

- `docs/ROADMAP.md`: phases 1 to 7, Jira tickets, steps, "done when" lists and the PHP 0 budget rule.
- `docs/ARCHITECTURE.md`: the four spines (data contract, data source adapter, feedback pipeline, identity) and how each phase is built.
- `.gitattributes` forcing LF line endings (`* text=auto eol=lf`) and marking images as binary, so Windows and CI see the same files.

## 2026-10-28: Scaffold (SCRUM-22)

Commit `338e925`.

### Added

- `app/` created with `npm create vite@latest app -- --template react-ts`, with ESLint.
- React 19.3, React Router 8.5, Vite 8.3, TypeScript ~6.0, typescript-eslint 8.

### Big changes

- TypeScript is pinned to `~6.0.0` instead of 7, because typescript-eslint 8 needs TypeScript below 6.1. See the Roadmap's stack notes.
