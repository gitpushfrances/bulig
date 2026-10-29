# Bulig Roadmap

Help Along the Way. Road help and local services for travellers anywhere, added one checked area at a time. The first pilot area is Guiuan and Mercedes, Eastern Samar, Philippines.

**Scope:** Bulig is built to work in any country from day one (the data has a country and an area on every record, see [ARCHITECTURE.md](ARCHITECTURE.md#1-data-contract)). It *launches* in one small area because a small, accurate directory beats a large, stale one. New areas and countries open in Phase 7, each only after its emergency numbers are verified.

Last updated: 2026-10-29 · Owner: John · Stack doc: https://claude.ai/artifact/Y5jJVoa3DaWnfe6SkoNptU

How each phase is built and how the parts connect: see [ARCHITECTURE.md](ARCHITECTURE.md). What every screen looks like and how people move through the app: see [UI-UX.md](UI-UX.md).

## How to read this

Each phase has a **goal**, the **Jira tickets** it covers, the **steps**, a **done when** list, and a **move on when** trigger. Don't start a phase until the previous one's trigger is met. Tickets marked *(new)* are proposals and aren't in Jira yet.

Validation (SCRUM-8 to 19) keeps running in the background. It doesn't block any phase, but its answers can change what Phases 3 to 6 build.

| Phase | Name | Rough size | Release tag | Cost |
| --- | --- | --- | --- | --- |
| 1 | Setup and skeleton | 1 week | v0.1 | Free |
| 2 | Emergency + Services PWA | 2 to 3 weeks | v0.2 | Free |
| 3 | First pilot (Philippines) | 5 to 7 weeks (includes the new screens from UI-UX.md) | v0.3 | Free (use the `bulig.<subdomain>.workers.dev` link) |
| 4 | Backend and admin (Laravel) | 4 to 6 weeks | v0.4 | Free tier (see risks) |
| 5 | Community features | 4 to 6 weeks | v0.5 | Free |
| 6 | Android app (Capacitor), optional | 2 weeks | v1.0 | Free APK; Play Store only once funded |
| 7 | More areas and countries | ongoing | v1.x | Free until traffic or funding says otherwise |

**Budget rule: PHP 0.** Every phase has a free path. Paid items (domain, Play Store, paid server) are listed as upgrades for when Bulig earns money or wins a grant, never as blockers.

Sizes assume evenings and weekends, solo. They're guesses until you've finished Phase 1 and know your real pace.

## Stack at a glance

- **Frontend:** Vite 8.3, React 19.3, TypeScript 6.0.x (not 7, because typescript-eslint 8 needs TypeScript below 6.1), ESLint, React Router 8, plain CSS Modules, vite-plugin-pwa 2.0, Vitest 5
- **Data (Phases 1 to 3):** JSON files in `app/public/data/<country>/`, one folder per country (`ph/` first)
- **Hosting:** Cloudflare Worker with static assets, free plan (`app/wrangler.jsonc`)
- **Map (optional):** MapLibre GL JS 6.16 + OpenFreeMap tiles
- **Backend (Phase 4+):** Laravel 13, PHP 8.5, PostgreSQL + PostGIS, Sanctum, Filament 5, Pest 5
- **Native (Phase 6):** Capacitor 8

## Ground rules for every phase

1. **Emergency Help** never needs a login and never shows ads. It never says help was dispatched or a location was sent, and it only lists numbers someone has checked. Numbers last checked more than 180 days ago are hidden. An area only goes live once its country's main emergency number and its local numbers are verified.
2. **`main` is always deployable.** Work on `feat/...` or `fix/...` branches, merge by pull request, and wait for green CI before merging.
3. **Test on a real phone** (a low-cost Android with Chrome is the main target) before closing any UI ticket. Resizing a desktop browser checks layout only; touch, speed, the address bar, install and offline need a real device.
4. **Nothing country-specific is hard-coded.** Emergency numbers, categories' local names, languages and privacy notices come from data or per-country config, never from the code.
5. **One phase at a time.** New ideas go into the Jira backlog, not into the current phase.
6. **At the end of each phase:** tag a release (`git tag v0.x`), write 3 lines in `docs/CHANGELOG.md`, and spend 15 minutes updating this file.

---

## Phase 1: Setup and skeleton (v0.1)

**Goal:** a live URL with three empty tabs, deployed automatically from GitHub.

**Tickets:** SCRUM-21, SCRUM-22, SCRUM-23

**Steps**

1. SCRUM-21: install Node 24 with fnm, Git and VS Code with its extensions. Clone `gitpushfrances/bulig`. (`local-setup.md` is not written yet; see the README "Getting started".)
2. SCRUM-22: `npm create vite@latest app -- --template react-ts`, pick ESLint, then `npm install -D typescript@~6.0.3`, `npm install` and `npm install react-router`.
3. Add the root `.gitignore` and `README.md`, then make the first commit and push to `main`.
4. Connect the repo to Cloudflare (it creates a Worker with static assets): root `app`, build `npm run build`, deploy `npx wrangler deploy`. The output folder and SPA fallback live in `app/wrangler.jsonc`.
5. Add `.github/workflows/ci.yml`, which runs `npm ci`, `npm run lint`, `npx vitest run` and `npm run build` on every pull request.
6. SCRUM-23: write the tab bar and the routes `/` (Emergency), `/services` and `/about`, with placeholder text.
7. Remove the Vite demo content: the counter, the logos and `App.css`.

**Done when**

- [ ] The `*.workers.dev` link opens on your phone and shows three tabs
- [ ] Refreshing on `/services` doesn't give a 404
- [x] A pull request with a deliberate type error fails CI (PR #6)
- [ ] SCRUM-21, 22 and 23 are moved to Done

**Move on when:** all of the above are checked. Nothing else blocks Phase 2.

---

## Phase 2: Emergency + Services PWA (v0.2)

**Goal:** the core product works offline, using sample data.

**Tickets:** SCRUM-24, SCRUM-25, SCRUM-26, SCRUM-27

**Steps**

1. SCRUM-24: create `src/types.ts` with `Area`, `EmergencyContact` and `Service` (every record has a `country` and an `area`), plus `public/data/ph/areas.json`, `emergency-contacts.json` and `services.json` holding 3 to 5 records each, marked `"sample": true`. Write a Vitest test that fails if any record is missing `verifiedAt` or `source`.
2. Write a `useData(country)` hook that fetches that country's files and handles loading and error states.
3. SCRUM-25: build the Emergency page. Show the country's main emergency number first (911 for PH sample data), then the local numbers as `tel:` links with "Last checked" dates, and apply the 180-day hide rule. Write tests for the expiry rule and for the national number always coming first.
4. SCRUM-26: build the Services page with an area picker (country, then town), category chips, search, and call and directions buttons. Save the chosen area in `localStorage`. Category labels come from data, so "Tire repair" can show as "Vulcanizing" in the Philippines.
5. SCRUM-27: add vite-plugin-pwa with a manifest, icons and theme colour. Precache the app shell and use NetworkFirst for `/data/*.json`. Show an "Offline, showing saved data" note when offline.
6. Make sample records visibly different (for example, a grey "SAMPLE" badge) so they can never be mistaken for real data.

**Done when**

- [ ] With the phone in airplane mode, the installed app opens, Emergency shows the national number (911 in the PH sample), and Services lists the sample shops (checked in headless Edge offline mode; still to do on a real phone)
- [x] An expired test contact is hidden (test + sample record)
- [x] A tire repair shop in a sample area can be reached in 3 taps or fewer (2: Vulcanizing, Call)
- [x] CI is green and test coverage includes the emergency rules

**Move on when:** the app works offline on your phone AND you have at least some real, verified data from SCRUM-17 and SCRUM-18. Without real data there is nothing to launch, so if data collection is slow, collect data before writing more code.

---

## Phase 3: First pilot in the Philippines (v0.3)

**Goal:** real people in the first pilot area use it, and you learn from them. The first area is not the only one: everything learned here becomes the checklist for opening the next area anywhere.

**Built so far (2026-10-30, sample data):** ✅ navigation (five tabs, the floating Emergency button, no top bar) · ✅ Home ("What's wrong?" tiles, location line, hotline) · ✅ Nearby results (nearest card with Call and Route, more nearby) · ✅ Map (MapLibre + OpenFreeMap, pins, in-app OSRM routes) · ✅ Saved · ✅ accounts (login, onboarding sign-up, guest = Emergency only) · ✅ production-style Profile, Help, draft Terms and Privacy · ✅ Others (new local businesses). ✅ hours, features, chips, "usually open" and Place details. **Still to do:** real data, report wrong info (SCRUM-30), analytics (SCRUM-31), Waray About, OPEN-AN-AREA.md (SCRUM-32).

**Tickets:** SCRUM-28, SCRUM-17, SCRUM-18, plus the new ones below

- *(new)* Load verified real data and remove all sample records
- *(new)* Keep the Worker named `bulig` so the free link is `bulig.<subdomain>.workers.dev`. (Upgrade later, when funded: buy bulig.app, about USD 15/year.)
- *(new)* Add Cloudflare Web Analytics (free, no cookies) to count visits and installs
- *(new)* Add a "Report wrong info" link that opens a short Google Form
- ✅ **New navigation:** five tabs (Home, Services, Map, Saved, Profile), Emergency behind a floating red button on every screen. `/services` and `/about` keep working.
- ✅ Home: "What's wrong?" tiles, the location line from GPS with a picker fallback, hotline card (911 one tap) and local numbers. (No mini map.)
- ✅ Nearby results (`/nearby/:need`): nearest place as a big card with Call and Route, then the rest as a list. Plus "Nearest usually open", filter chips, status and feature tags.
- ✅ Map tab with MapLibre and OpenFreeMap, lazy-loaded, category pins, bottom sheet, list fallback, plus in-app routes (OSRM, free)
- ✅ Saved and Profile (accounts, photo, theme, install, legal), and Place details (`/place/:id`).
- ✅ Data: `Area.lat/lng`, `Service.features`, `Service.weeklyHours`, `Service.open24h`, `Service.subtype` (all optional, contract v1 stays)
- *(new)* Write a Privacy and About page in plain English plus the pilot area's local language (Waray), set up so more languages can be added per area
- *(new)* Write `docs/OPEN-AN-AREA.md`: the checklist for opening a new area or country (verify emergency numbers, collect services, local category names, language, privacy notice), based on what this pilot taught

**Steps**

1. Replace sample data with verified records only. Each record needs a source and a check date, plus features (tubeless, air pump and so on) and usual hours per day, because the new screens show them.
2. Build the new navigation and screens from [UI-UX.md](UI-UX.md), in this order: Home and Hotlines, Nearby results, Place details, Saved and Profile, then Map. Each one is usable on its own, so stop after Nearby results if data collection falls behind.
3. SCRUM-28: test on 2 to 3 different Android phones, run Lighthouse (aim for Performance 90+ and Accessibility 90+), and do a sunlight readability check.
4. Hand it to 5 people who aren't you (riders, tricycle drivers, a vulcanizing shop owner). Give each one a task ("you have a flat tire, find help") and watch without helping. Write down where they get stuck and how many taps it took.
5. Fix the top 3 problems.
6. Set up analytics and an Open Graph preview image (so the link looks trustworthy when shared on Facebook), then share it: local Facebook groups, terminals, gas stations, and the shops that are listed.
7. Run a weekly loop. Every week, process "wrong info" reports, re-check anything flagged, and look at analytics.

**Done when**

- [ ] The `workers.dev` link is live with only verified data for the pilot area
- [ ] From Home, 911 takes 1 tap, and calling the nearest tire shop takes 2 (Flat tire, Call), on a real phone
- [ ] At least 30 people outside your circle have opened it (from analytics)
- [ ] At least 3 "wrong info" reports have been received and fixed, which shows the feedback loop works
- [ ] The usage numbers are written into the SCRUM-15 validation results

**Move on when:** at least one of these is true:

- updating the JSON by hand takes you more than about 1 hour a week
- shop owners are asking to edit their own listings
- users want to submit reports inside the app

If none of these happen after 6 weeks, don't build a backend. Find out why people aren't using it first.

---

## Phase 4: Backend and admin (v0.4)

**Goal:** move the data into a real database that you edit through an admin panel. The app reads from an API but keeps working offline.

**Tickets (all new):**

- Build the API to [docs/API.md](API.md): every endpoint, payload and error the app already expects (public reads, accounts, `/me`, saved places)
- Set up the Laravel 13 project in `api/` with PostgreSQL + PostGIS (Docker locally)
- Database schema: countries, areas, categories, services, emergency_contacts, with `geography(Point,4326)` and audit timestamps
- Import script that loads the current JSON into the database
- Read API: `GET /api/v1/services?country=&area=&category=&near=lat,lng` and `GET /api/v1/emergency-contacts?country=&area=`
- Filament admin, with only you as the user, for full editing and a "verified" workflow
- Switch the frontend from JSON files to the API, while keeping the service worker cache as the offline fallback
- Deploy the API and set up nightly backups
- Pest tests for the API and for the emergency-number rules

**Steps**

1. Install Herd (PHP 8.5, Composer) and Docker Desktop with `postgis/postgis`.
2. Run `laravel new api` in the repo root, then add Sanctum (`php artisan install:api`) and Filament.
3. Write the migrations, the import script, and API resources. Cache responses so the API stays cheap.
4. Test with Pest. The emergency rules from Phase 2 have to hold on the server as well.
5. Hosting, free option: an Oracle Cloud Always Free Ampere VM (2 OCPU, 12 GB RAM, 200 GB storage). **Choose Singapore as your home region when you sign up; you can't change it later.** Run Nginx, PHP-FPM and PostgreSQL there, with a nightly `pg_dump` to Cloudflare R2 (free up to 10 GB).
6. Without a domain, put the API behind a free Cloudflare Tunnel (`cloudflared`), which gives HTTPS without opening ports. Move to `api.bulig.app` once the domain is bought.
7. Switch the frontend over behind a setting, so you can flip back to JSON if the API breaks.

**Risks**

- Oracle reclaims Always Free VMs that stay idle for 7 days, measured as CPU, network and memory all below 20%. A quiet pilot app could hit that. Keep the nightly backups, and be ready to move to a paid Singapore VPS (roughly USD 6 to 12 a month) if Oracle reclaims the VM.
- The free plan has no support and no uptime promise. Emergency Help must keep working from the cached data even when the API is down.

**Done when**

- [ ] You edit a shop in Filament and the change shows in the app within 1 hour
- [ ] Emergency and Services still work in airplane mode
- [ ] A backup restored to your laptop matches production
- [ ] The JSON files are retired, or kept only as the fallback

**Move on when:** the backend has been stable for 2 weeks AND users or shop owners are asking for ways to contribute.

---

## Phase 5: Community features (v0.5)

**Goal:** let people improve the data without you becoming a full-time moderator.

**Tickets (all new; build them in this order and stop when the demand stops):**

1. "Suggest a correction" form in the app, stored as pending and reviewed in Filament
2. Road hazard reports (flood, landslide, road closed) with location, an expiry time, and admin approval before they appear publicly
3. Business owner accounts using Sanctum, with email or Google sign-in (no SMS OTP, because it costs money for every message), so owners can claim a listing and edit hours and phone; edits are reviewed
4. Rate limiting, abuse reporting, and data retention rules that meet the privacy law of every country served (Data Privacy Act RA 10173 in the Philippines first; GDPR before any EU area)

**Rules**

- Every submission is moderated before it shows publicly. No public free-text reviews yet.
- Reports expire automatically. A road that was flooded yesterday may be fine today.
- Emergency contacts are never editable by the public.

**Done when**

- [ ] Real users have submitted at least 10 corrections or reports, and each was reviewed within 48 hours
- [ ] At least 3 shop owners have claimed their listing
- [ ] Moderation takes you under 2 hours a week

**Move on when:** you need a native feature such as reliable background location, or users clearly refuse to use the PWA. Otherwise skip to Phase 7.

---

## Phase 6: Android app with Capacitor (v1.0), optional

**Skip this phase if money is zero.** The PWA already installs to the home screen for free from Chrome ("Add to Home screen"), works offline, and opens like an app. That covers most of what a Play Store app gives you.

**Free path:** build an APK with Capacitor and share it directly (website download link or Facebook). Downside: people must allow "install unknown apps", which many won't trust. Good for testers, weak for the public.

**Paid path, once funded:** Google Play needs a one-time USD 25 developer account. Look for that money from a local sponsor, a startup grant (for example DICT or DOST programs in the Philippines), or the first paying business.

**Goal:** Bulig as an Android app, built from the same code.

**Tickets (all new):**

- Add Capacitor 8 to `app/` (`npm install @capacitor/core @capacitor/cli @capacitor/android`, then `npx cap init` and `npx cap add android`)
- App icon, splash screen, store listing, screenshots and privacy policy URL
- Free: signed APK for direct sharing. Paid, once funded: Google Play developer account (USD 25 one-time) and internal testing track
- Native-only extras, only if needed: Geolocation plugin, share sheet

**Done when**

- [ ] The APK (or Play Store build, if funded) installs on 3 test phones
- [ ] The PWA and the Android app show the same data

**Move on when:** v1.0 is stable for a month.

---

## Phase 7: More areas and countries (v1.x)

Pick features based on what pilot users actually asked for, not on this list. Candidates:

- More areas: nearby towns first, then other provinces, then other countries. Each new area needs verified data first, and each new country also needs its main emergency number(s), local category names, a privacy notice for its law, and at least one local language.
- Route planning with useful stops along the way
- Roadside help requests that connect a user to a listed mechanic (Bulig itself does not dispatch anyone)
- Business model, tested one at a time: verified-business badges, featured listings that are clearly labelled, or LGU and tourism office partnerships. Never ads or paywalls on Emergency Help.
- iOS through Capacitor (Apple developer account, USD 99/year, only when funded; iPhone users can already add the PWA to their home screen from Safari)

**Rule:** a new area, country or feature goes in only if the current ones are kept accurate. A large, stale directory is worse than a small, accurate one.

---

## What to do when you finish a ticket

1. Merge the pull request, then confirm CI is green and the Cloudflare deploy succeeded.
2. Check it on your phone.
3. Move the Jira ticket to Done and leave a one-line comment saying what changed.
4. Pick the next ticket in this phase. If there are none left, check the phase's "Done when" list.
